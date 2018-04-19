'use strict';

const fs = require('fs');
const enfslist = require("enfslist");
const path = require('path');

const args = process.argv.slice(2);
const runningMode = args[0] || 'searchHtml';
const searchMode = args[1] || 'all';
let config = require(__dirname + '/config.json');

if (runningMode === 'searchHtml' && searchMode === 'notReplaced') {
  config[runningMode].searchReplaceRules.file = __dirname + '/search-rules/wont-replace.csv';
}

console.log('runningMode:' + runningMode);
console.log('searchMode:' + searchMode);

const returnCleanCsvString = require(__dirname + '/lib/returnCleanCsvString');
const returnFilesBasedOnExtension = require(__dirname + '/lib/returnFilesBasedOnExtension');
const returnCssSelectorToHtmlAttribute = require(__dirname + '/lib/returnCssSelectorToHtmlAttribute');
const returnPreparedUpgradeRulesFromCsvFile = require(__dirname + '/lib/returnPreparedUpgradeRulesFromCsvFile');
const Counter = require(__dirname + '/lib/Counter');
const logMessage = require(__dirname + '/lib/logMessage');

let runJsAndCssActions = function () {
    for (let actualRule of config[runningMode].searchReplaceRules.rules) {
      let splittedCssClasses = returnCleanCsvString(actualRule.search).split('.');
      for (let iSplittedCssClasses = 0; iSplittedCssClasses < splittedCssClasses.length; iSplittedCssClasses++) {
        let actualSplittedRule, regExpObject;
        if (runningMode === 'searchJs') {
          actualSplittedRule = '\\.' + splittedCssClasses[iSplittedCssClasses];
          regExpObject = new RegExp('([\'"]{1})' + actualSplittedRule + '([\'"]{1})', 'g');
        }
        if (runningMode === 'searchCss') {
          actualSplittedRule = '\\.' + splittedCssClasses[iSplittedCssClasses] + ' ';
          regExpObject = new RegExp(actualSplittedRule, 'g');
        }
        //console.log(regExpObject, 'regExpObject');
        while (result = regExpObject.exec(fileToReplaceFileContent)) {

          if (foundFiles.indexOf(actualFile) === -1) {
            foundFiles.push(actualFile);
            logMessage.displayActualFile(actualFile);
          }

          Counter.count(runningMode);
          Counter.count(runningMode + suffixForGlobalCounter);

          logMessage.displayRunningMessage(actualSplittedRule.substr(1), runningMode);
        }
      }
    }
    return {splittedCssClasses, iSplittedCssClasses, actualSplittedRule, regExpObject};
  },
  runHtmlActions = function () {
    let result;
    while (result = regExForHtmlClassAttribute.exec(fileToReplaceFileContent)) {
      let htmlClassAttributesString = result[2],
        htmlClassAttributes = htmlClassAttributesString.trim().split(' ');

      // Todo: refactor to for(i=0;i<....length){}
      for (let actualRule of config[runningMode].searchReplaceRules.rules) {
        let replaceString = actualRule.replace,
          itemIndexToReplace;

        itemIndexToReplace = htmlClassAttributes.indexOf(actualRule.search);

        if (itemIndexToReplace !== -1) {
          if (foundFiles.indexOf(actualFile) === -1) {
            foundFiles.push(actualFile);
            logMessage.displayActualFile(actualFile);
          }
          switch (runningMode) {
            case 'searchHtml':

              Counter.count(runningMode);
              Counter.count(runningMode + suffixForGlobalCounter);

              logMessage.displayRunningMessage(actualRule.search, runningMode);

              break;
            case 'replaceHtml':

              Counter.count(runningMode);
              Counter.count(runningMode + suffixForGlobalCounter);

              replaceString = returnCssSelectorToHtmlAttribute(replaceString);
              //console.log(replaceString);
              htmlClassAttributes[itemIndexToReplace] = replaceString;
              break;
          }
        }
      }

      if (runningMode === 'replaceHtml') {
        let htmlClassAttributesNew = htmlClassAttributes.join(' ');
        if (htmlClassAttributesString !== htmlClassAttributesNew) {
          fileToReplaceFileContent = fileToReplaceFileContent.replace(htmlClassAttributesString, htmlClassAttributesNew);
          logMessage.displayRunningMessage(htmlClassAttributesString + ' > ' + htmlClassAttributesNew, runningMode);
        }
      }

    }
    return {htmlClassAttributesString, htmlClassAttributes, replaceString, htmlClassAttributesNew};
  },
  regExForHtmlClassAttribute = /(\s+class=['"]{1})(.[^'"]*)(['"]{1})/g,
  suffixForGlobalCounter = 'All',
  foundFiles = [];

Counter.registerCounter(runningMode);
Counter.registerCounter(runningMode + suffixForGlobalCounter);
Counter.registerCounter('files');
//console.log(config[runningMode].searchReplaceRules.file);
try {
  config[runningMode].files.filteredFiles = fs.readFileSync(config[runningMode].searchReplaceRules.file, "utf8");
  //console.log(config[runningMode].files.filteredFiles);
} catch (err) {
  console.log('error in config[runningMode].files.filteredFiles :', err);
  process.exit(1);
}
config[runningMode].searchReplaceRules.rules = returnPreparedUpgradeRulesFromCsvFile(config[runningMode].files.filteredFiles, runningMode);


config[runningMode].files.filteredFiles = returnFilesBasedOnExtension(
  enfslist.listSync(config[runningMode].files.folder),
  config[runningMode].files.filesMatcher,
  config[runningMode].files.exclude
);


for (let i = 0; i < config[runningMode].files.filteredFiles.length; i++) {
  var actualFile = config[runningMode].files.filteredFiles[i],
    fileToReplaceFileContent, result;
  try {
    fileToReplaceFileContent = fs.readFileSync(actualFile, 'utf8');
  } catch (err) {
    console.log('error in fs.readFileSync(actualFile, :', err);
    process.exit(1);
  }

  Counter.resetCounter(runningMode);

  if (runningMode === 'searchJs' || runningMode === 'searchCss' || runningMode === 'replaceJs') {
    var {splittedCssClasses, iSplittedCssClasses, actualSplittedRule, regExpObject} = runJsAndCssActions();
  }

  if (runningMode === 'searchHtml' || runningMode === 'replaceHtml') {
    var {htmlClassAttributesString, htmlClassAttributes, replaceString, htmlClassAttributesNew} = runHtmlActions();
    if (runningMode === 'replaceHtml') {
      try {
        fs.writeFileSync(actualFile, fileToReplaceFileContent);
      } catch (err) {
        console.log('error in fs.writeFileSync(actualFile, fileToReplaceFileContent); :', err);
        process.exit(1);
      }
    }
  }
  if (Counter.returnCounter(runningMode) > 0) {
    logMessage.displayRunningCountSelectorMessage(Counter.returnCounter(runningMode), runningMode);
  }
}

logMessage.displayCompleteMessage(Counter.returnCounter(runningMode + suffixForGlobalCounter), foundFiles.length, runningMode);

process.exit(0);
