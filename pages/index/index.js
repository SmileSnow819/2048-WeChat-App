// 页面的入口
Page({
  data: {
    points: 0,
    step: 0,
    grid: [],
    blocks: [],
    animations: [],
  },
  onLoad: function () {
    // 定义常量 计算格子间距
    this.GRID_SIZE = 4;
    this.BLOCK_WIDTH = 130;
    this.BLOCK_GRP = 16;
    this.CANVAS_SIZE = 600;
    this.BLOCK_SPACING =
      (600 -
        (this.GRID_SIZE * this.BLOCK_WIDTH +
          (this.GRID_SIZE - 1) * this.BLOCK_GRP)) /
      2;
    this.BLOCK_BACKGROUND_COLOR = '#E0F7FA';
    this.CANVAS_BACKGROUND_COLOD = 'rgb(187,173,160)';
    this.BLOCK_FANT_SIZE = 50;
    this.NUMBER_COLOR = 'rgb(119,110,101)';
    this.BLOCK_BACKGROUND_COLOR_START = 'EEE4DA';
    this.BLOCK_BACKGROUND_COLOR_END = 'ECD22E';
    //测试shiftBlock()函数
    const test = new Tests();
    test.testShiftBlock();

    // 初始化背景格子（4*4）
    let grid = [];
    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        grid.push({
          top: this.BLOCK_SPACING + i * (this.BLOCK_WIDTH + this.BLOCK_GRP),
          left: this.BLOCK_SPACING + j * (this.BLOCK_WIDTH + this.BLOCK_GRP),
          bgColor: this.BLOCK_BACKGROUND_COLOR,
        });
      }
    }
    this.setData({ grid });

    // 初始化游戏实例
    this.game = new Game(this);
    this.updateGameView();

  },

  // 事件：触摸开始
  handleTouchStart: function (e) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  },

  // 事件：触摸结束，根据滑动方向移动
  handleTouchEnd: function (e) {
    let touchEndX = e.changedTouches[0].clientX;
    let touchEndY = e.changedTouches[0].clientY;
    let deltaX = touchEndX - this.touchStartX;
    let deltaY = touchEndY - this.touchStartY;
    let direction = '';
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      direction = deltaY < 0 ? 'up' : 'down';
    } else {
      direction = deltaX < 0 ? 'left' : 'right';
    }
    if (direction) {
      this.advanceGame(direction);
    }
  },

  advanceGame: function (direction) {
    let result = this.game.advance(direction);
    if (result.moves.length > 0) {
        this.updateGameView();
    }
  },

  // 重置游戏
  restartGame: function () {
    this.game.initializeData();
    this.updateGameView();
  },

  // Agent
  startAI: function () {
    let agent = new GameAgent(this.game, this);
    agent.play();
  },

  // 根据当前游戏状态更新页面数据
  updateGameView: function () {
    let blocks = [];
    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        //遍历获取每个block的id
        let number = this.game.data[i][j];
        if (number) {
          let existingBlock = this.data.blocks.find(
            (block) => block.id === i + '-' + j
          );
          blocks.push({
            id: i + '-' + j,
            top: this.BLOCK_SPACING + i * (this.BLOCK_WIDTH + this.BLOCK_GRP),
            left: this.BLOCK_SPACING + j * (this.BLOCK_WIDTH + this.BLOCK_GRP),
            number: number,
            size: this.BLOCK_WIDTH,
            bgColor: this.getColor(number),
          });
        }
      }
    }
    this.setData({
      blocks: blocks,
      points: this.game.points,
      step: this.game.step,
    });
  },

  // 根据数字计算背景颜色（用log防止线性渐变）
  getColor: function (number) {
    let level = Math.log(number);
    function hexToRGB(hex) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
    let rgbStart = hexToRGB(this.BLOCK_BACKGROUND_COLOR_START);
    let rgbEnd = hexToRGB(this.BLOCK_BACKGROUND_COLOR_END);
    let color = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      color[i] = Math.floor(
        rgbStart[i] + (rgbEnd[i] - rgbStart[i]) * (level / 12)
      );
    }
    return `rgb(${color[0]},${color[1]},${color[2]})`;
  },

  // 产生 a~b 范围内的随机整数
  randomInt: function (a, b) {
    return a + Math.floor(Math.random() * (b + 1 - a));
  },

  // 从数组中随机选取一个元素
  randomChoice: function (arr) {
    return arr[this.randomInt(0, arr.length - 1)];
  },
});

// 游戏类
class Game {
  constructor(page) {
    this.page = page;
    this.data = [];
    this.points = 0;
    this.step = 0;
    this.loadGame();
    if (this.data.length === 0) {
      this.initializeData();
    }
  }
  //初始化
  initializeData() {
    this.data = [];
    this.points = 0;
    this.step = 0;
    for (let i = 0; i < this.page.GRID_SIZE; i++) {
      let row = [];
      for (let j = 0; j < this.page.GRID_SIZE; j++) {
        row.push(null);
      }
      this.data.push(row);
    }
    // 初始生成两个数字块
    this.generateNewBlock();
    this.generateNewBlock();
  }
  //存储游戏
  saveGame() {
    const gameState = { data: this.data, points: this.points, step: this.step };
    wx.setStorageSync('gameState', gameState);
  }
  //加载游戏
  loadGame() {
    const savedState = wx.getStorageSync('gameState');
    if (savedState) {
      this.data = savedState.data;
      this.points = savedState.points;
      this.step = savedState.step;
    }
  }
  //随机产生新BLOCK
  generateNewBlock() {
    let possiblePositions = [];
    for (let i = 0; i < this.page.GRID_SIZE; i++) {
      for (let j = 0; j < this.page.GRID_SIZE; j++) {
        if (this.data[i][j] === null) {
          possiblePositions.push([i, j]);
        }
      }
    }
    if (possiblePositions.length > 0) {
      let pos = this.page.randomChoice(possiblePositions);
      this.data[pos[0]][pos[1]] = 2;
    }
  }
  // **合并移动算法** 后有Test类测试主算法
  shiftBlock(rowArr, isReverse) {
    let head = 0;
    let tail = 1;
    let incr = 1;
    let points = 0;
    if (isReverse) {
      head = rowArr.length - 1;
      tail = head - 1;
      incr = -1;
    }
    let moves = [];
    while (tail < rowArr.length && tail >= 0) {
      if (rowArr[tail] === null) {
        tail += incr;
      } else {
        if (rowArr[head] === null) {
          rowArr[head] = rowArr[tail];
          rowArr[tail] = null;
          moves.push([tail, head]);
          tail += incr;
        } else if (rowArr[head] === rowArr[tail]) {
          rowArr[head] *= 2;
          rowArr[tail] = null;
          points += rowArr[head];
          moves.push([tail, head]);
          head += incr;
          tail += incr;
        } else {
          head += incr;
          if (head === tail) {
            tail += incr;
          }
        }
      }
    }
    return { rowArr, moves, points };
  }
  // 向指定方向前进一步
  advance(command) {
    //记录一维数组移动的初始位置和末位置
    //right or down reverse
    let moves = [];
    const GRID_SIZE=4;
    let isReverse = command === 'right' || command === 'down';
    if (command === 'left' || command === 'right') {
      for (let i = 0; i < GRID_SIZE; i++) {
        let rowMove = this.shiftBlock(this.data[i], isReverse);
        this.points += rowMove.points;
        //push二维点
        for (let move of rowMove.moves) {
          moves.push([
            [i, move[0]],
            [i, move[1]],
          ]);
        }
      }
    } else if (command === 'up' || command === 'down') {
      for (let i = 0; i < GRID_SIZE; i++) {
        let tmp = [];
        //转置数组
        for (let j = 0; j < GRID_SIZE; j++) {
          tmp.push(this.data[j][i]);
        }
        //合并数组
        let colMove = this.shiftBlock(tmp, isReverse);
        this.points += colMove.points;
        //push二维点
        for (let move of colMove.moves) {
          moves.push([
            [move[0], i],
            [move[1], i],
          ]);
        }
        //转置数组
        for (let j = 0; j < GRID_SIZE; j++) {
          this.data[j][i] = tmp[j];
        }
      }
    }
    if (moves.length !== 0) {
      this.step++;
      this.generateNewBlock();
    }
    this.saveGame();
    return {
      moves,
      points: this.points,
      step: this.step,
    };
  }
}

// 利用决策树实现评估游戏状态
class GameEvaluation extends Game {
  constructor(game) {
    super(game.page);
    this.data = JSON.parse(JSON.stringify(game.data));
    this.children = {};
    this.parent = null;
    this.points = game.points;
    this.bestChildren = null;
    this.move = null;
  }
  copy() {
    return new GameEvaluation(this);
  }
  //评价下一步
  evaluateNextStep() {
    for (let command of ['left', 'right', 'up', 'down']) {
      let next = this.copy();
      let result = next.advance(command);
      if (result.moves.length > 0) {
        next.move = command;
        this.children[command] = next;
        next.parent = this;
      } else {
        this.children[command] = null;
      }
    }
  }
  //从当前节点，向上遍历树
  backPropagate() {
    let node = this;
    let points = this.points;
    while (node.parent) {
      if (
        !node.parent.bestChildren ||
        node.parent.bestChildren.points < points
      ) {
        node.parent.bestChildren = { move: node.move, points };
      }
      node = node.parent;
    }
  }
}

class GameAgent {
  constructor(game, page) {
    this.game = game;
    this.page = page;
  }
  //广度优先搜索（BFS）算法来遍历游戏状态空间树
  evaluate(depth = 4) {
    let currGame = new GameEvaluation(this.game);
    let queue = [currGame];
    let nextQueue = [];
    for (let i = 0; i < depth; i++) {
      for (let g of queue) {
        g.evaluateNextStep();
        for (let cmd in g.children) {
          if (g.children[cmd]) {
            nextQueue.push(g.children[cmd]);
          }
        }
      }
      queue = nextQueue;
      nextQueue = [];
    }
    for (let g of queue) {
      g.backPropagate();
    }
    return currGame.bestChildren;
  }
  //移动命令
  issueCommand(command) {
    this.game.advance(command);
    this.page.updateGameView();
  }
  //一次Agent玩多少论
  play(rounds = 10) {
    if (rounds > 0) {
      let result = this.evaluate();
      if (result && result.move) {
        this.issueCommand(result.move);
      }
      setTimeout(() => {
        this.play(rounds - 1);
      }, 200);
    }
  }
}

//Tests
class Tests {
  compareArray(fun_output, output) {
    //遍历fun_output和output数组判断每一个元素
    if (fun_output.length !== output.length) return false;
    for (let i = 0; i < output.length; i++) {
      if (output[i] !== fun_output[i]) return false;
    }
    return true;
  }

  testShiftBlock() {
    let gameTest = new Game();
    let testCases = [
      [
        [2, 2, null, null],
        [4, null, null, null],
      ],
      [
        [4, 2, null, 2],
        [4, 4, null, null],
      ],
      [
        [2, null, null, null],
        [2, null, null, null],
      ],
      [
        [null, null, null, null],
        [null, null, null, null],
      ],
      [
        [4, 8, 8, null],
        [4, 16, null, null],
      ],
      [
        [2, 4, 8, 4],
        [2, 4, 8, 4],
      ],
      [
        [2, 2, 4, 4],
        [4, 8, null, null],
      ],
      [
        [4, 8, 8, 4],
        [4, 16, 4, null],
      ],
    ];
    let errFlag = false;
    for (let test of testCases) {
      for (let isReverse of [true, false]) {
        let input = test[0].slice();
        let result = test[1].slice();
        if (isReverse === true) {
          input.reverse();
          result.reverse();
        }
        let fun_result = gameTest.shiftBlock(input, isReverse).rowArr;
        if (!this.compareArray(fun_result, result)) {
          errFlag = true;
          console.log('error');
          console.log(input, result, fun_result);
        }
      }
    }
    if (!errFlag) {
      console.log('pass!');
    }
  }
}
