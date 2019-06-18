'use strict'
const PSD = require('psd');
const exec = require('child_process').exec;
const child_process = require('child_process')
const co = require('co')
const prompt = require('co-prompt')
const exportname = require('../config/exportpng3.json')
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
    projectDir, //项目目录
    projectPsdDir, //项目psd目录
    pngOutputDir, //png输出目录
    realPngOutputDir,  //真实使用的png输出目录
    pngExportNum = 0, //当前png输出个数，切换到下一个psd的时候置零
    lackPngArr = [],
    colorObj={},
    projectName;

/**
 * 切图主函数
 */
let nodeScan = (node) => {
    let _descendants = node.descendants();
    let _nodeLength = exportname[currentIndex - 1].length
    message.log(`该PSD文件图层总数：${_descendants.length}|所需导出图层数：${exportname[currentIndex - 1].length} \n开始切第${currentIndex}个PSD文件`);
    (function iterator(i) {
        if (pngExportNum >= _nodeLength || (i >= _descendants.length && pngExportNum < _nodeLength)) { //当输出图层满足配置或遍历完psd发现不满足配置
            message.log(`还剩：${exportname[currentIndex - 1].join(",")}`)
            lackPngArr.push(exportname[currentIndex - 1])
            minImage();
            return;
        }
        if (_descendants[i].type === 'layer' && _descendants[i].layer && exportname[currentIndex - 1].includes(_descendants[i].name)) {
            let suffix = /bg$/.test(_descendants[i].name) ? `jpg` : `png`; //含bg视为背景图，后期可以规范
            realPngOutputDir = /^role-\d$/.test(_descendants[i].name) ? pngOutputDir + '/extras' : pngOutputDir;
           
            _descendants[i].layer.image.saveAsPng(`${realPngOutputDir}/${_descendants[i].name}.${suffix}`).then((err) => {
                if(err){return console.log(_descendants[i].name)}
                exportname[currentIndex - 1].splice(exportname[currentIndex - 1].findIndex(item => item === _descendants[i].name), 1) //将输出完的图层名从数组中清除，优化性能
                message.log(`成功输出第${pngExportNum + 1}个文件：${_descendants[i].name}.${suffix}`);
                pngExportNum++;
                iterator(i + 1);
            })
            return;
        }
        iterator(i + 1)

    })(0)
}
/**
 * 配置函数
 */
let writeConf = (dirname) => {
    projectDir = path.join(config.gamesitesDir, `/src/${dirname}`);
    projectPsdDir = path.join(config.psdDir, `/${dirname}`);
    fs.rename(`${projectDir}/css/gamekey_main.scss`, `${projectDir}/css/${dirname}_main.scss`, err => {
        if (err) {
            throw err;
            return;
        }
    })
    fs.rename(`${projectDir}/js/gamekey_main.js`, `${projectDir}/js/${dirname}_main.js`, err => {
        if (err) {
            throw err;
            return;
        }
    })
    //修改hoo-config配置
    let _reg = new RegExp(`gamekey`, 'g')
    let hooconf = fs.readFileSync(`${projectDir}/hoo-conf.js`, "utf-8").replace(_reg, dirname);
    fs.writeFileSync(path.join(`${projectDir}/hoo-conf.js`), hooconf);
    message.green('\n success:  配置成功! \n ');
}
/**
 * 图片压缩、裁剪
 */
let minImage = () => {
    message.green(`\n 开始压缩...${pngOutputDir}/`);
    imagemin([`${pngOutputDir}/*`], `${pngOutputDir}/`, { use: [imageminPngquant()] }).then((data) => {
        message.green(`\n success: 已完成压缩`);
        if (currentIndex == 2 || currentIndex == 3) { //如果是服务器列表页或是开服页
            //切背景图
            message.green(`\n 开始切背景图...`);

            gm(`${pngOutputDir}/bg.jpg`).crop(1000, 1000, 500, 0).write(`${pngOutputDir}/s-inner.jpg`, () => {
                gm(`${pngOutputDir}/bg.jpg`).crop(2000, 1000, 0, 0).fill('#fff').drawRectangle(505, 0, 1495, 1000).write(`${pngOutputDir}/bg.jpg`, () => {
                    message.green("\n DONE: 成功切出背景图");
                    currentIndex++;
                    psdExportHanlder();
                })
            });
            return;
        } else if (currentIndex == 4) { //手机官网
            message.green(`\n 开始切背景图...`);
            gm(`${pngOutputDir}/bg.jpg`).crop(640, 960, 0, 0).write(`${pngOutputDir}/bg.jpg`, () => {
                message.green("\n DONE: 成功切出背景图");
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
        message.green(`\n 开始压缩角色png...`); //压缩过大角色，加快加载速度
        imagemin([`${projectDir}/css/images/extras/*.png`], `${projectDir}/css/images/extras/`, { use: [imageminPngquant()] }).then(() => {

            if (lackPngArr[0].length) message.red(`首页缺少：${lackPngArr[0]}`);
            if (lackPngArr[1].length) message.red(`服务器列表页缺少：${lackPngArr[1]}`);
            if (lackPngArr[2].length) message.red(`开服页缺少：${lackPngArr[2]}`);
            if (lackPngArr[3].length) message.red(`手机官网缺少：${lackPngArr[3]}`);
            if (lackPngArr[4].length) message.red(`手机内页缺少：${lackPngArr[4]}`);
            message.green(`\n =========== 已完成 ============`);

            console.timeEnd('共耗时');
            message.green("本地开发模式...");
            message.green("正在检测文件变化...")
            child_process.execFile('hoo', ['wDev',`${projectName}`], function(error, stdout, stderr){
                if(error) {
                    console.error('error: ' + error);
                    return;
                }
                console.log('stdout: ' + stdout);
                console.log('stderr: ' + typeof stderr);
                return process.exit(); //进程关闭
            });
            
        });
        return;
    }
    pngOutputDir = path.join(projectDir, IOconfig[currentIndex - 1].outPutDir)
    let psdPath = `${projectPsdDir}/${IOconfig[currentIndex - 1].psdName}.psd`;   //psd路径
    message.log('正在打开PSD文件：', psdPath);
    fs.exists(psdPath, function (exists) { //判断psd是否存在
        if (!exists) {
            message.red(`\n erro: psd文件“${IOconfig[currentIndex - 1].psdName}”不存在!`);
            message.red(`\n ========= 已失败 ============`);
            process.exit();
        } else {
            let psd = PSD.fromFile(psdPath);    //打开PSD
            if (!psd || !psd.parse()) {
                throw new Error('Failed to parse PSD file ' + psdPath)
            }
            let psdNode = psd.tree();
            colorSet(psdNode.export());
            pngExportNum = 0;//同时置0
            nodeScan(psdNode);  //执行导出图层
        }
    });
}
/**
 * 项目存在判断
 */
let checkProjectExits = (dirname) => {
    fs.readdirSync(path.join(config.gamesitesDir, '/src/')).forEach(file => {
        if (file === dirname) {
            message.red("erro: 已有相同项目！");
            process.exit()
        }
    })
};
let colorSet = (node)=>{
    (function TreeIterator(node){
        let _children = node.children;
        if(!_children) return;
        _children.forEach(e=>{
            if(e.text){
                e.text.font.colors[0].pop(); //透明度去掉
                if(!colorObj[e.text.font.colors[0]]){
                    colorObj[e.text.font.colors[0]]=1;
                    return
                }
                colorObj[e.text.font.colors[0]]++
            }
        })
        
        _children.forEach(e=>{
            TreeIterator(e)
        })
    })(node);
    // console.log(utils.ObjSort(colorObj))
}
async function copyFiles(from, to) {
    try {
        await fs.copy(from, to)
        return true
        console.log('success!')
    } catch (err) {
        return false
        console.error(err)
    }
}
module.exports = (dirname) => {

    projectName = dirname;
    co(function* () {
        let _copyProject = yield prompt('请选取模板（B1,B2,B3）： ');
        if (!fs.existsSync(`${config.gamesitesDir}src/templates/${_copyProject}/common`)) {
            message.red(`erro: ${_copyProject}模板不存在！`);
            process.exit();
            return;
        }
        if (!fs.existsSync(`${config.gamesitesDir}src/templates/${_copyProject}/src`)) {
            message.red("erro: ${_copyProject}静态资源不存在！");
            process.exit();
            return;
        }
        // checkProjectExits(dirname); //相同项目检测，防止错误操作
        console.time('共耗时');
        fs.copy(`${config.gamesitesDir}src/templates/${_copyProject}/common/`, `${config.gamesitesDir}common.tpl.37.com/${projectName}/`).then((err)=>{
            if (err) return console.error(err)
            fs.copy(`${config.gamesitesDir}src/templates/${_copyProject}/src/`, `${config.gamesitesDir}src/${projectName}/`).then(()=>{
                writeConf(dirname);
                psdExportHanlder(currentIndex, process);    //开始切图了
            })
        })
    })
}