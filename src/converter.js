const path = require("path");
const {readFileSync, createWriteStream} = require('fs');
// const { writeFile }  =  require('node:fs/promises');

let componentJSON = JSON.parse(readFileSync(path.resolve(__dirname,"..",`segmentsWithChild.json`)));
let pen = createWriteStream("dsl/dsl.txt",{flags:'a'});
var nextLine = (line) => pen.write(`\n${line}`);

const layerWriter = ({layerName, layerType, isCustom, parent, children, layerProps, layerAnnotation}) =>{
  const numberOfChildren = children.length;
  const numberOfProps = Object.keys(layerProps).length;
  nextLine(`\t\tlayer ${layerName} {`)
  nextLine(`\t\t\ttype ${isCustom ? '"custom"' : '"mui"'} ${layerType};`)
  if(numberOfProps > 0){
    nextLine(`\t\t\tprops {${Object.keys(layerProps).map((key, idx)=>{
      const propType = typeof layerProps[key];
      if(propType==='string'){
        return `\n\t\t\t\t"${key}" = "${layerProps[key]}"${numberOfProps===idx+1 ? ',' : ''}`
      }
      else if(propType==='number' || propType==='boolean'){
        return `\n\t\t\t\t"${key}" = ${layerProps[key]}${numberOfProps===idx+1 ? ',' : ''}`
      }
      else if(propType==='object'){
        let printValue = JSON.stringify(layerProps[key],null,12);
        printValue = printValue.replaceAll(":"," =")
        printValue = printValue.replaceAll("}","\t\t\t\t}")
        return `\n\t\t\t\t"${key}" = ${printValue}`
      }
    })}\n\t\t\t};`)
  }
  else{
    nextLine(`\t\t\tprops {};`)
  }
  nextLine(`\t\t\tparent ${parent};`)
  if(numberOfChildren > 0){
    nextLine(`\t\t\tchildren [${children.map((child, idx) =>{
      return `\n\t\t\t\t${child}${numberOfChildren===idx+1 ?',':''}`
    })}\n\t\t\t];`)
  }
  else{
    nextLine(`\t\t\tchildren [];`)
  }
  let annotationPrintValue = JSON.stringify(layerAnnotation,null,8)
  annotationPrintValue = annotationPrintValue.replaceAll(':',' =')
  annotationPrintValue = annotationPrintValue.replace = annotationPrintValue.replaceAll("}","\t\t\t};")
  nextLine(`\t\t\tannotation ${annotationPrintValue}`)
  nextLine(`    };`)
}

const segmentWriter = (segment) =>{
  nextLine(`\tcomponent ${segment}() {`)
  for(let i=0; i<componentJSON[segment].length; i++){
    layerWriter(componentJSON[segment][i]);
  }
  nextLine(`  };`)
}

const converter = async() => {
  nextLine("dsl{")
  for(let segment in componentJSON) {
    segmentWriter(segment);
  }
  nextLine("};")
  pen.end();
};


converter();