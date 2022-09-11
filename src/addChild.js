const { componentsSegmentsGenerator } = require("./segments");
const path = require("path");
const {readFileSync} = require('fs');
const { writeFile }  =  require('node:fs/promises');

let componentSegments = JSON.parse(readFileSync(path.resolve(__dirname,"..",`segments.json`)));

const insertName = (childUniqueId,insertSegment,insertIndex) =>{
  let childLayerName; 
  loop1:
    for(let segment in componentSegments){
  loop2:    
      for(let i=0; i<componentSegments[segment].length; i++){
        if(componentSegments[segment][i].layerUniqueId === childUniqueId){
          childLayerName = componentSegments[segment][i].layerName;
          // if(childLayerName.includes('root')){
            //   childLayerName = segment;
            // }
            break loop1;
          }
        }
      }
      console.log(childLayerName);
    componentSegments[insertSegment][insertIndex].children.push(childLayerName);
}
const insertChildLayerName = () => {
  for (let segment in componentSegments){
    for (let i=0; i<componentSegments[segment].length; i++){
      componentSegments[segment][i].childrensUniqueIds.map(childId=>insertName(childId,segment,i))
    }
  }
}


const childNameInsertion = async() => {
 insertChildLayerName();
await writeFile("segmentsWithChild.json", JSON.stringify(componentSegments, null, 4),{flags:'w'})
process.exit(1);
};

childNameInsertion();