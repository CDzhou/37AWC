'use strict'
const PSD = require('psd');
const exec = require('child_process').exec;
const child_process = require('child_process')
const co = require('co')
const prompt = require('co-prompt')
let exportname = require('../config/WDExport.json')
// const config = require('../templates')
const chalk = require('chalk')
const fs = require('fs-extra')
const os = require('os');
const path = require('path')
// const pngExports = require('../utils/pngExports.js');
const config = require('../config/config.js')
const IOconfig = require('../config/IOConfig.json');
const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
const gm = require('gm').subClass({ imageMagick: true });
const utils = require('../utils/utils.js')
var colors = require('colors');
var inquirer = require('inquirer')

const message = {
    log: console.log,
    green: (str) => {
        console.log(chalk.green(str));
    },
    red: (str) => {
        console.log(chalk.red(str));
    }
}

let projectName;
let PSDname = 'wd';
let projectPsdDir;
let realPngOutputDir;
let pngExportNum = 0;
let cropX, cropY, feWidth, feHeight;
let nodeScan = (node) => {
    let _descendants = node.descendants();
    // console.log(node.children())
    message.log(` [info] `.cyan + `该PSD文件图层总数：${_descendants.length}|所需导出图层数：${exportname.length}`);
    (function iterator(i) {
        if (i >= _descendants.length) {
            if (exportname.length) { message.log(` [warning] `.yellow + exportname); }
            bgCrop();

        }
        if (!_descendants[i]) return;
        if (_descendants[i].type === 'layer' && _descendants[i].layer && exportname.includes(_descendants[i].name)) {

            let suffix = /bg$/.test(_descendants[i].name) ? `jpg` : `png`; //含bg视为背景图，后期可以规范
            _descendants[i].layer.image.saveAsPng(`${realPngOutputDir}/${_descendants[i].name.substr(1)}.${suffix}`).then((err) => {
                message.log(` [success] `.green + `成功输出第${pngExportNum + 1}个文件：` + `${_descendants[i].name}.${suffix}`.magenta);
                pngExportNum++;
                exportname.splice(exportname.findIndex(item => item === _descendants[i].name), 1) //将输出完的图层名从数组中清除，优化性能
                iterator(i + 1);
                return;
            })
        } else {
            iterator(i + 1);
        }

    })(0)
}
function bgCrop() {
    message.log(` [info] `.cyan + `对背景图处理中......`);
    if (!(fs.existsSync(`${realPngOutputDir}/log-bg.jpg`) && fs.existsSync(`${realPngOutputDir}/reg-bg.jpg`) && fs.existsSync(`${realPngOutputDir}/ser-bg.jpg`))) {
        message.log(` [error] `.red + '请确认已输出背景图');
        return process.exit();

    }
    gm(`${realPngOutputDir}/log-bg.jpg`).crop(feWidth, feHeight, cropX, cropY).write(`${realPngOutputDir}/log-bg.jpg`, () => {
        gm(`${realPngOutputDir}/reg-bg.jpg`).crop(feWidth, feHeight, cropX, cropY).write(`${realPngOutputDir}/reg-bg.jpg`, () => {
            gm(`${realPngOutputDir}/ser-bg.jpg`).crop(feWidth, feHeight, cropX, cropY).write(`${realPngOutputDir}/ser-bg.jpg`, () => {
                message.log(` [success] `.green + `已完成`)
                process.exit();
            })
        })
    })
}
function psdExportHanlder() {
    projectPsdDir = path.join(config.psdDir, `/${projectName}`);
    let psdPath = `${projectPsdDir}/${PSDname}.psd`;   //psd路径
    message.log(` [info] `.cyan + '正在打开PSD文件：', psdPath);
    fs.exists(psdPath, function (exists) { //判断psd是否存在
        if (!exists) {
            message.log(`\n ` + `[error]`.red + ` psd文件“${PSDname}”不存在!`);
            message.log(`\n ` + `[error]`.red + ` ---------已失败--------`);
            process.exit();
        } else {
            let psd = PSD.fromFile(psdPath);    //打开PSD
            if (!psd || !psd.parse()) {
                throw new Error('Failed to parse PSD file ' + psdPath)
            }
            let psdNode = psd.tree();
            nodeScan(psdNode);  //执行导出图层
        }
    });
}

module.exports = async (dirname) => {
    projectName = dirname;
    realPngOutputDir = `${config.gamesitesDir}img1.37wanimg.com/${projectName}/css/client/game`;
    let _exist;
    fs.readdirSync(path.join(config.gamesitesDir, '/img1.37wanimg.com/')).forEach(file => {
        if (file === projectName) {
            return _exist = true;
        }
    });
    if (!_exist) {
        message.log(`暂未有这个官网`.red);
        process.exit()
    }
    let _choice = Object.keys(exportname);
    let _copyProject = (await inquirer
        .prompt({
            type: 'list',
            name: 'templateName',
            message: '请选取模板?',
            choices: _choice
        })).templateName;
    exportname = exportname[_copyProject]; //获取对应的输出的数据
    let croplocation = (await inquirer.prompt([
        {
            type: 'Input',
            name: 'croplocation',
            message: '请输入切点坐标x,y（例：100,100）：',
            validate: function (s) {
                if (/^\d{1,4},(\d{1,4}$)/.test(s.trim())) {
                    return true;
                } else {
                    message.log(` 格式错误`.red)
                    return false;
                }
            }
        }
    ])).croplocation;
    cropX = croplocation.split(",")[0];
    cropY = croplocation.split(",")[1];
    let _area = (await inquirer.prompt([
        {
            type: 'Input',
            name: '_pro',
            message: '请输入前端区域的宽高（例：100,100）：',
            validate: function (s) {
                if (/^\d{1,4},(\d{1,4}$)/.test(s.trim())) {
                    return true;
                } else {
                    message.log(` 格式错误`.red)
                    return false;
                }
            }
        }
    ]))._pro;
    feWidth = _area.split(",")[0];
    feHeight = _area.split(",")[1];
    try {
        fs.copySync(`${config.gamesitesDir}src/templates/${_copyProject}/common/`, `${config.gamesitesDir}common.tpl.37.com/${projectName}/`)

    } catch (error) {
        console.log(error)
    }
    try {
        fs.copySync(`${config.gamesitesDir}src/templates/${_copyProject}/js/`, `${config.gamesitesDir}img1.37wanimg.com/${projectName}/js/`)

    } catch (error) {
        console.log(error)
    }
    try {
        fs.copySync(`${config.gamesitesDir}src/templates/${_copyProject}/css/`, `${config.gamesitesDir}img1.37wanimg.com/${projectName}/css/`)

    } catch (error) {
        console.log(error)
    }
    psdExportHanlder()
    console.time('共耗时');
    // inquirer
    //     .prompt({
    //         type: 'list',
    //         name: 'templateName',
    //         message: '请选取模板?',
    //         choices: _choice
    //     }).then(answer => {
    //         let _copyProject = answer.templateName;
    //         exportname = exportname[_copyProject]; //获取对应的输出的数据
    //         inquirer.prompt([
    //             {
    //                 type: 'Input',
    //                 name: 'croplocation',
    //                 message: '请输入切点坐标x,y（例：100,100）：',
    //                 validate: function (s) {
    //                     if (/^\d{1,4},(\d{1,4}$)/.test(s.trim())) {
    //                         return true;
    //                     }else{
    //                         message.log(` 格式错误`.red)
    //                         return false;
    //                     }
    //                 }
    //             }
    //         ]).then((answers) => {
    //             let croplocation = answers.croplocation;
    //             cropX = croplocation.split(",")[0];
    //             cropY = croplocation.split(",")[1];
    //            
    //         })


    //     });


}