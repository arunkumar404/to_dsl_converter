const path = require("path");
const prompts = require("prompts");
const consola = require("consola");
const { readFile, writeFile }  =  require('node:fs/promises');
const {readFileSync} = require('fs');

let dataInputs;
let hierarchyData;
let componentSegments = {};

// Get layerDetials
const getLayerDetails = (layerId, detailNeeded) =>{
  const parent = hierarchyData[layerId].parent;
  
  for (let segment in componentSegments){
    for (let i=0; i<componentSegments[segment].length; i++){
      if(detailNeeded==='layerParentComp'){
        if(componentSegments[segment][i].layerUniqueId === parent && !componentSegments[segment][i].isCustom){
          return segment;
        }
      }
      else if(detailNeeded==='parentLayerName'){     
        if(componentSegments[segment][i].layerUniqueId === layerId && !componentSegments[segment][i].isCustom){
          return componentSegments[segment][i].layerName;          
        }
      }
    }
  }
};
// Read layer type
const getLayerType = async(layerId) =>{
  try{
    const layerReactDetails = JSON.parse(await readFile(path.resolve(dataInputs.Data_Route,"reactDetails",`${layerId}.json`)));
    const layerType = layerReactDetails.componentType.split("-");
    return layerType;
  } catch(error){
    const errorMessage = `Error parsing layer: ${layerId} react details: ${error}`;
    consola.error(errorMessage);
  }
}

// Create DSL layers
const layerCreator = async(layerComponent, layerId, muiCompType, isRoot = false, isCustom = false, customLayerType = '') =>{
  const parentId = hierarchyData[layerId].parent;
  const childrens = hierarchyData[layerId].children;
  const layerProps = JSON.parse(readFileSync(path.resolve(dataInputs.Data_Route,"reactDetails",`${layerId}.json`),'utf-8')).componentProps;
  const fullLayerAnnotation = JSON.parse(readFileSync(path.resolve(dataInputs.Data_Route,"boundingBox",`${layerId}.json`),'utf-8'));
  const requiredLayerAnnotation = {
    top: fullLayerAnnotation.y,
    left: fullLayerAnnotation.x,
    width: fullLayerAnnotation.width,
    height: fullLayerAnnotation.height,
  }
  if(isRoot){
    componentSegments[layerComponent].push({
      layerUniqueId: layerId,
      layerName: '$root',
      layerType: muiCompType,
      isCustom: isCustom,
      parent: null,
      children: [],
      childrensUniqueIds: childrens,
      layerProps: layerProps,
      layerAnnotation: requiredLayerAnnotation,
    })
    return;
  }
  const parentLayerName = getLayerDetails(parentId, "parentLayerName");
  if(isCustom){
  componentSegments[layerComponent].push({
    layerUniqueId: layerId,
    layerName: `$id${componentSegments[layerComponent].length}`,
    layerType: customLayerType,
    isCustom: isCustom,
    parent: parentLayerName,
    children: [],
    childrensUniqueIds: [],
    layerProps: {},
    layerAnnotation: requiredLayerAnnotation,
  })
    return;
  }
  componentSegments[layerComponent].push({
    layerUniqueId: layerId,
    layerName: `$id${componentSegments[layerComponent].length}`,
    layerType: muiCompType,
    isCustom: isCustom,
    parent: parentLayerName,
    children: [],
    childrensUniqueIds: childrens,
    layerProps: layerProps,
    layerAnnotation: requiredLayerAnnotation,
  })
  await writeFile("segments.json", JSON.stringify(componentSegments, null, 4),{flags:'w'})
};

const componentCreator = (layerType, muiCompType, layerId) => {
  let layerComponent;
  if(layerType==='root'){
    layerComponent = 'root';
    componentSegments['root'] = [];
    consola.info("Root Component created");
  }
  else if(layerType==='RC'){
    // Create layer reference for RC in its parent
    let rcRefLayerComponent = getLayerDetails(layerId, "layerParentComp");
    layerCreator(rcRefLayerComponent, layerId, muiCompType , false, true, `RC-${Object.keys(componentSegments).length}`);

    // Create Reusable component
    layerComponent = `RC-${Object.keys(componentSegments).length}`;
    componentSegments[layerComponent] = [];
    consola.info(`Reusable Component ${layerComponent} created`);
  };
  layerCreator(layerComponent, layerId, muiCompType, true);
};

// Parse individual layers
const layerParser = async(layerId) =>{
  let layerComponent = getLayerDetails(layerId, "layerParentComp");
  const layerType = await getLayerType(layerId);
  if(layerType[0]==='root' || layerType[0]==='RC'){
    componentCreator(layerType[0],layerType[1], layerId);
    hierarchyData[layerId].children.map(layer=>{
      layerParser(layer);
    });
    return;
  }
  layerCreator(layerComponent, layerId, layerType[0]);
  hierarchyData[layerId].children.map(layer=>{
      layerParser(layer);
    });
  };
  
  // Main converter 
  const componentsSegmentsGenerator = async() => {
    dataInputs = await prompts([
      {
        type: "text",
        name: "Data_Route",
        message: "Where the AI data is stored",
        initial: path.resolve(__dirname,"..","data","1"),
      },
      {
        type: "text",
        name: "Hierarchy_Data_File_Name",
        message: "What is the name of Hierarchy data file",
        initial: "index.json",
      },
      {
        type: "text",
        name: "DSL_Output_Route",
        message: "Where the DSL file should be stored ?",
        initial: path.resolve(__dirname,"..","dsl"),
    },
  ]);
  try{
    hierarchyData = JSON.parse(await readFile(path.resolve(dataInputs.Data_Route, dataInputs.Hierarchy_Data_File_Name))); 
    layerParser("root");
  } catch(error){
    const errorMessage = `Error parsing Components hierarchy data: ${error}`;
    consola.error(errorMessage);
  };
};

componentsSegmentsGenerator();