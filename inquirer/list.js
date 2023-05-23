const { EventEmitter } = require('events');
const rl = require('readline');
const MuteStream = require('mute-stream');
const { fromEvent } = require('rxjs');
const ansi = require('ansi-escapes');

const option = {
  type: 'list',
  name: 'name',
  message: 'select a name',
  default: 1,
  choices: [
    { name: 'sam', value: 'sam' },
    { name: 'tom', value: 'tom' },
    { name: 'jerry', value: 'jerry' },
  ],
};

function prompt(option) {
  return new Promise((resolve, reject) => {
    try {
      const list = new List(option);
      // 渲染列表
      list.render();
      list.on('exit', (answer) => {
        resolve(answer);
      });
    } catch (error) {
      reject(error);
    }
  });
}

class List extends EventEmitter {
  constructor(option) {
    super();
    this.name = option.name;
    this.message = option.message;
    this.choices = option.choices;
    this.input = process.stdin;
    // 通过mute-stream来实现控制台的输入输出
    const ms = new MuteStream();
    ms.pipe(process.stdout);
    this.output = ms;
    // 创建readline接口
    this.rl = rl.createInterface({
      input: this.input,
      output: this.output,
    });
    // 默认选中
    this.selected = option.default || 0;
    this.height = this.choices.length + 1;
    // 监听keypress事件
    this.keypress = fromEvent(this.rl.input, 'keypress').subscribe(
      this.onKeypress
    );
    // 是否选择完毕
    this.done = false;
  }
  // 键盘事件
  onKeypress = (keyMap) => {
    // 获取key
    const key = keyMap[1];
    if (key.name === 'up') { // 上键点击
      if (this.selected > 0) {
        this.selected--;
      }
    } else if (key.name === 'down') { // 下键点击
      if (this.selected < this.choices.length - 1) {
        this.selected++;
      }
    } else if (key.name === 'return') { // 回车点击
      this.done = true;
    }
    this.render();
    // 完成选择后退出
    if (this.done) {
      this.close()
      this.emit('exit', this.choices[this.selected])
    }
  }
  render() {
    // 解除mute状态
    this.output.unmute();
    // 清除控制台
    this.clean();
    // 写入list内容
    this.output.write(this.getContent());
    // 开启mute状态 限制用户不可输入
    this.output.mute();
  }
  getContent() {
    if (this.done) {
      return `\x1B[32m?\x1B[39m \x1B[1m${this.message} \x1B[22m\x1B[36m${this.choices[this.selected].name}\x1B[39m\n`;
    } else {
      const title = `\x1B[32m?\x1B[39m \x1B[1m${this.message}(use arrow keys)\x1B[22m\n`;
      const list = this.choices.map((item, index) => {
        // 选中的选项前面加上❯
        if (index === this.selected) {
          return `\x1B[36m❯ ${item.name}\x1B[39m`;
        }
        return `  ${item.name}`;
      });
      return title + list.join('\n');
    }
  }
  // 清除控制台
  clean() {
    const emptyLines = ansi.eraseLines(this.height);
    this.output.write(emptyLines);
  }
  close() {
    this.output.unmute();
    this.rl.output.end();
    this.rl.pause();
    this.rl.close();
    this.keypress.unsubscribe();
  }
}

prompt(option).then((answer) => {
  console.log('answer', answer);
});
