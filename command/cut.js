// 'use strict'
const PSD = require('psd');
const exec = require('child_process').exec;
const child_process = require('child_process')
const co = require('co')
const prompt = require('co-prompt')
let exportname = require('../config/GameSiteExport.json')
// const config = require('../templates')
const chalk = require('chalk')
const fs = require('fs-extra')
const os = require('os');
const path = require('path')
// const pngExports = require('../utils/pngExports.js');
const config = require('../config/config.js')
let IOconfig = require('../config/IOConfig.json');
const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
const gm = require('gm').subClass({ imageMagick: true });
const utils = require('../utils/utils.js')
var colors = require('colors');
var inquirer = require('inquirer');
const message = {
    log: console.log,
    green: (str) => {
        console.log(chalk.green(str));
    },
    red: (str) => {
        console.log(chalk.red(str));
    }
}



let currentIndex = 1, //psd指针
    psdName = IOconfig[currentIndex - 1].psdName, //当前psd名
    projectDir, //项目目录
    projectPsdDir, //项目psd目录
    pngOutputDir, //png输出目录
    realPngOutputDir,  //真实使用的png输出目录
    pngExportNum = 0, //当前png输出个数，切换到下一个psd的时候置零
    lackPngArr = [],
    colorObj = {},
    projectName;

/**
 * 切图主函数
 */
let nodeScan = (node) => {
    let _descendants = node.descendants();
    let _nodeLength = exportname[psdName].length
    message.log(` [info] `.cyan + `该PSD文件图层总数：${_descendants.length}|所需导出图层数：${exportname[psdName].length}`);
    message.log(` [info] `.cyan + `开始切第${currentIndex}个PSD文件`);
    (function iterator(i) {
        if (pngExportNum >= _nodeLength || (i >= _descendants.length && pngExportNum < _nodeLength)) { //当输出图层满足配置或遍历完psd发现不满足配置
            if (exportname[psdName].length) { message.log(`[warning] `.yellow + `还剩：` + `${exportname[psdName].join(",")}`.yellow) } //剩余
            lackPngArr.push(exportname[psdName])
            minImage();
            return;
        }
        if (_descendants[i].type === 'layer' && _descendants[i].layer && exportname[psdName].includes(_descendants[i].name)) {
            let suffix = /bg$/.test(_descendants[i].name) ? `jpg` : `png`; //含bg视为背景图，后期可以规范
            realPngOutputDir = /^@role-\d$/.test(_descendants[i].name) ? pngOutputDir + '/extras' : pngOutputDir;
            // console.log(_descendants[i].name)
            _descendants[i].layer.image.saveAsPng(`${realPngOutputDir}/${_descendants[i].name.substr(1)}.${suffix}`).then((err) => {
                if (err) { return console.log(_descendants[i].name) }
                exportname[psdName].splice(exportname[psdName].findIndex(item => item === _descendants[i].name), 1) //将输出完的图层名从数组中清除，优化性能
                message.log(` [success] `.green + `成功输出第${pngExportNum + 1}个文件：` + `${_descendants[i].name}.${suffix}`.magenta);
                pngExportNum++;
                iterator(i + 1);
            })
            return;
        }
        iterator(i + 1)

    })(0)
}
/**
 * 图片压缩、裁剪
 */
let minImage = () => {
    message.log(`\n ` + `[info]`.cyan + ` 开始压缩...${pngOutputDir}/`);
    imagemin([`${pngOutputDir}/*`], `${pngOutputDir}/`, { use: [imageminPngquant()] }).then((data) => {
        message.log(`\n ` + `[success]`.green + ` 已完成压缩`);
        if (psdName == 'server' || psdName == 'opening') { //如果是服务器列表页或是开服页
            //切背景图
            message.log(`\n ` + `[info]`.cyan + ` 开始切背景图...`);

            gm(`${pngOutputDir}/bg.jpg`).crop(1000, 1100, 500, 0).write(`${pngOutputDir}/s-inner.jpg`, () => {
                gm(`${pngOutputDir}/bg.jpg`).crop(2000, 1100, 0, 0).fill('#fff').drawRectangle(505, 0, 1495, 1000).write(`${pngOutputDir}/bg.jpg`, () => {
                    message.log(`\n ` + `[success]`.green + ` 成功切出背景图`);
                    currentIndex++;
                    psdExportHanlder();
                })
            });
            return;
        } else if (psdName  == 'wap') { //手机官网
            message.log(`\n ` + `[info]`.cyan + ` 开始切背景图`);
            gm(`${pngOutputDir}/bg.jpg`).crop(640, 960, 0, 0).write(`${pngOutputDir}/bg.jpg`, () => {
                message.log(`\n ` + `[success]`.green + ` 成功切出背景图`);
                currentIndex++;
                psdExportHanlder();
            });
            return;
        };
        currentIndex++;
        psdExportHanlder();
    })
}
/**
 * 切图处理控制器
 */
function psdExportHanlder() {
    if (currentIndex > IOconfig.length) {  //结束
        message.log(`\n ` + `[info]`.cyan + ` 开始压缩角色png`);//压缩过大角色，加快加载速度
        imagemin([`${projectDir}/css/images/extras/*.png`], `${projectDir}/css/images/extras/`, { use: [imageminPngquant()] }).then(() => {
            if (lackPngArr[0]&&lackPngArr[0].length) message.log(`[warning] ` + `首页缺少：${lackPngArr[0]}`);
            if (lackPngArr[1]&&lackPngArr[1].length) message.log(`[warning] ` + `服务器列表页缺少：${lackPngArr[1]}`);
            if (lackPngArr[2]&&lackPngArr[2].length) message.log(`[warning] ` + `开服页缺少：${lackPngArr[2]}`);
            if (lackPngArr[3]&&lackPngArr[3].length) message.log(`[warning] ` + `手机官网缺少：${lackPngArr[3]}`);
            if (lackPngArr[4]&&lackPngArr[4].length) message.log(`[warning] ` + `手机内页缺少：${lackPngArr[4]}`);
            message.log(`\n ` + `[success]`.green + ` -------已完成--------`);

            console.timeEnd('共耗时');
           
            return process.exit(); //进程关闭
        });
        return;
    }
    pngOutputDir = path.join(projectDir, IOconfig[currentIndex - 1].outPutDir);
    psdName = IOconfig[currentIndex - 1].psdName;//修改
    let psdPath = `${projectPsdDir}/${IOconfig[currentIndex - 1].psdName}.psd`;   //psd路径
    message.log(` [info] `.cyan + '正在打开PSD文件：', psdPath);
    fs.exists(psdPath, function (exists) { //判断psd是否存在
        if (!exists) {
            message.log(`\n ` + `[error]`.red + ` psd文件“${IOconfig[currentIndex - 1].psdName}”不存在!`);
            message.log(`\n ` + `[error]`.red + ` ---------已失败--------`);
            process.exit();
        } else {
            let psd = PSD.fromFile(psdPath);    //打开PSD
            if (!psd || !psd.parse()) {
                throw new Error('Failed to parse PSD file ' + psdPath)
            }
            let psdNode = psd.tree();
            // colorSet(psdNode.export());
            pngExportNum = 0;//同时置0
            nodeScan(psdNode);  //执行导出图层
        }
    });
}
/**
 * 判断项目是否存在
 */
let existsProject = (dirname) => {
    if (fs.readdirSync(path.join(config.gamesitesDir, '/src/')).includes(dirname)) return true;
    return false;
}
/**
 * 返回模板选项
 */
let PSDChoice = (arr)=>{
    if (!arr) return;
    let _result=[]
    arr.forEach((item,index)=>{
        if(index===0){
            _result.push({
                name:item._comment,
                checked:true
            })
        }else {
            _result.push({
                name:item._comment
            })
        }

    });
    return _result;
}
/**
 * 返回用户选择的io
 */
let selcetedIO = (arr1,arr2)=>{
    if(!(arr1&&arr2)) return;
    let _result=[];
    arr1.forEach((item1)=>{
        arr2.forEach((item2)=>{
            if(item1===item2._comment){
                _result.push(item2)
            }
        })
    });
    return _result;
}
module.exports = async (dirname) => {

    projectName = dirname;
    let _choice = Object.keys(exportname);
    let commonAnswer = await inquirer.prompt({
        type: 'list',
        name: 'templateName',
        message: '请选取模板?',
        choices: _choice
    });
    let _psdArrAnswer = await inquirer.prompt({
        type: 'checkbox',
        message: '请选择已有psd(首页，服务器列表页，开服页，手机官网，手机内页，新闻页)',
        name: 'toppings',
        choices:PSDChoice(IOconfig),
        validate: function(answer) {
            if (answer.length < 1) {
              return 'psd都没有你用什么awc？';
            }
            return true;
          }
    });

    IOconfig = selcetedIO(_psdArrAnswer.toppings,IOconfig);//通过选项更改io
    // console.log(_psdArrAnswer)
    if(commonAnswer.templateName){
        let _copyProject = commonAnswer.templateName;
            exportname = exportname[_copyProject]; //获取对应的输出的数据
            if (!fs.existsSync(`${config.gamesitesDir}src/templates/${_copyProject}/common`)) {
                message.log(`\n ` + `[error]`.red + ` ${_copyProject}模板不存在！`);
                return process.exit();
            }
            if (!fs.existsSync(`${config.gamesitesDir}src/templates/${_copyProject}/src`)) {
                message.log(`\n ` + `[error]`.red + ` ${_copyProject}静态资源不存在！`);
                return process.exit();
                
            }
            let existsFlag = existsProject(dirname);
            if (!existsFlag) {
                message.log(`\n ` + `[error]`.red + ` ${projectName}未初始化`)
                return process.exit();
            }
            projectDir = path.join(config.gamesitesDir, `/src/${dirname}`);
            projectPsdDir = path.join(config.psdDir, `/${dirname}`);
            psdExportHanlder(currentIndex, process);    //开始切图了
            console.time('共耗时');
    };

}