# 简介
本人（前端开发）在前司工作中用于游戏官网开发的小工具，用于提升工作效率；实质上是一款利用psd.js对psd文件进行快速切图，再利用高度封装好的html+css对设计图快速还原成网站的工具；

# 主要用到的开源项目
* psd.js
* commander.js
* imagemin-pngquant
* gm
* inquirer.js
* ...

# 环境搭建
## 安装graphicsmagick
* mac电脑：brew install imagemagick， brew install graphicsmagick
* windows电脑：下载安装包
## 拷贝源码到电脑任意位置
1. 命令行进入到源码根目录下
2. npm install (安装所需依赖)
3. npm link (在环境变量新建软连接指向到源码的bin)
4. 命令行输入AWC –h出现信息为绑定成功

# AWC使用
1.进入官网目录
2.AWC -h获取指令相关帮助
![Image text](https://raw.githubusercontent.com/CDzhou/37AWC/master/images/2.png)

# AWC核心原理剖析
![Image text](https://raw.githubusercontent.com/CDzhou/37AWC/master/images/%E5%9B%BE%E7%89%87%201.png)
