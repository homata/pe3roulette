var numbers_init = function(number) {
    var numbers = [];
    for (var i = 0; i < number; i++) {
        numbers.push(i+1);
    }
    return shuffle(numbers);
}

var shuffle = function(array) {
    for(var i = (array.length - 1); 0 < i; i--){
        // 0〜(i+1)の範囲で値を取得
        var r = Math.floor(Math.random() * (i + 1));
        // 要素の並び替えを実行
        var tmp = array[i];
        array[i] = array[r];
        array[r] = tmp;
    }
    return array;
}
const INIT_NUMBER = 16

var vm = new Vue({
  el: '#roulette',
  data: {
    cx: 100,    // 円の中心座標
    cy: 60,     // 円の中心座標
    r: 50,      // 円の半径
    sr: 20,     // スイッチの半径
    number: INIT_NUMBER, // 数字の数
    numbers: numbers_init(INIT_NUMBER),
    dragStartPos: {x: 0, y: 0}, // パイのドラッグ量計算用
    movePos: {x: 0, y: 0},      // パイのドラッグ量計算用
    dragIndex: -1,              // パイのドラッグ量計算用
    dragPos: [],                // パイのドラッグ量計算用
    focusItem: null,  // 回るフォーカス
    focusIndex: 0,    // 回るフォーカス
    interval: 10,     // 回るフォーカス
    status: "stop",   // stop / running / breaking / pause
    vSwitch: 0.84,    // スイッチの色の濃さ
    highlightPieIndex: -1, // ハイライトされたパイのインデックス
    jitterBase: [-3, -2, -1, 0, 1, 2, 3],
  },
  watch: {
    number: function(newValue, oldValue) {
      this.numbers = numbers_init(this.number)
    }
  },
  computed: {
    items: function() {
      var items = [];
      var th = 2 * Math.PI / this.numbers.length;
      for (var i = 0; i < this.numbers.length; i++) {
        var x0 = this.cx + this.r * Math.cos(-i * th);
        var y0 = this.cy + this.r * Math.sin(-i * th);
        var x1 = this.cx + this.r * Math.cos(-(i + 1) * th);
        var y1 = this.cy + this.r * Math.sin(-(i + 1) * th);
        var d = this.d([this.cx, this.cy, x0, y0, x1, y1]);
        var v = 0.9;
        if (this.highlightPieIndex == i) {
          v = 1.0;
        }
        var fill = hsvToRgb(i * 360 / this.numbers.length, 1, v);
        var textX = this.cx + this.r * 0.8 * Math.cos(-(i + 0.5) * th);
        var textY = this.cy + this.r * 0.8 * Math.sin(-(i + 0.5) * th);
        var textSize = "size20";
        if (this.numbers.length > 6) {
          textSize = "size10";
        }
        if (this.numbers.length > 20) {
          textSize = "size4";
        }
        if (this.numbers.length >= 30) {
          textSize = "size2";
        }
        items.push(
          {
            d: d,
            fill: fill,
            textX: textX,
            textY: textY,
            text: this.numbers[i],
            textSize: textSize
          }
        );
      }
      return items;
    },
    dragItem: function() {
      if (this.dragPos.length > 0) {
        var newDragPos = [
          this.dragPos[0] + this.movePos.x,
          this.dragPos[1] + this.movePos.y,
          this.dragPos[2] + this.movePos.x,
          this.dragPos[3] + this.movePos.y,
          this.dragPos[4] + this.movePos.x,
          this.dragPos[5] + this.movePos.y
        ];
        return {
          d: this.d(newDragPos),
          filla: this.items[this.dragIndex].fill
        };
      } else {
        return {};
      }
    },
    // ルーレットが回っているかブレーキを掛けている途中か
    showCurrent: function() {
      return this.status == "running" || this.status == "breaking";
    },
    // ルーレット確定状態
    showFixedNum: function() {
      return this.status == "pause";
    },
    showFocus: function() {
      return this.status == "running" || this.status == "breaking";
    },
    canEdit: function() {
      return this.status == "stop";
    },
    // スイッチの色
    fillSwitch: function() {
      return hsvToRgb(0, 0, this.vSwitch);
    }
  },
  methods: {
    d: function(pos) {
      return "M " + pos[0] + " " + pos[1] + " L " + pos[2] + " " + pos[3] + " A " + this.r + " " + this.r + " 0 0 0 " + pos[4] + " " + pos[5] + " Z";
    },
    parseD: function(d) {
      var pd = d.split(" ");
      return [
        Number(pd[1]),
        Number(pd[2]),
        Number(pd[4]),
        Number(pd[5]),
        Number(pd[12]),
        Number(pd[13])
      ];
    },
    dragStart: function(index, event) {
      if (this.status == "running" || this.status == "breaking") return;
      if (this.numbers.length == 2) return;
      this.dragStartPos = this.getSvgPos(event);
      this.movePos = {x: 0, y: 0};
      this.dragIndex = index;
      this.dragPos = this.parseD(this.items[index].d);
    },
    drag: function(event) {
      if (this.status == "running") return;
      if (this.dragIndex != -1) {
        var currentPos = this.getSvgPos(event);
        this.movePos = {
          x: currentPos.x - this.dragStartPos.x,
          y: currentPos.y - this.dragStartPos.y
        };
      }
    },
    dragStop: function(event) {
      if (this.status == "running") return;
      if (this.dragIndex == -1) return;
      var currentPos = this.getSvgPos(event);
      if (this.isOut(currentPos.x, currentPos.y)) {
        // 円の外なら削除
        this.numbers.splice(this.dragIndex, 1);
      }
      // 削除によってフォーカス対象がなくなったときのための処理
      if (this.focusIndex > this.items.length - 1) {
        this.focusIndex = this.items.length - 1;
      }
      this.dragPos = [];
      this.dragIndex = -1;
    },
    switchRoulette: function(event) {
      // ルーレット停止または一時停止
      if (this.status == "stop" || this.status == "pause") {
        // ルーレット開始
        this.interval = 50;
        this.status = "running";
        var jitter = this.jitterBase[Math.floor(Math.random() * 7)];
        var self = this;
        setTimeout(function countDown() {
          // ルーレット一時停止
          if (self.interval > 400) {
            self.status = "pause";
            return;
          }
          beep();
          if (self.focusIndex > 0) {
            self.focusIndex--;
          } else {
            self.focusIndex = self.numbers.length - 1;
          }
          self.focusItem = self.items[self.focusIndex].d;
          // ブレーキ中はインターバルを増やしていく
          if (self.status == "breaking") {
            self.interval += 16 + jitter;
          }
          setTimeout(countDown, self.interval);
        }, this.interval);
      } else if (this.status == "running") {
        // ルーレット中にブレーキON
        this.status = "breaking";
      } else if (this.status == "breaking") {
        // ブレーキ中は無効
        return;
      }
    },
    isOut: function(x, y) {
      return ((Math.pow((this.cx - x), 2) + Math.pow((this.cy - y), 2)) > Math.pow(this.r, 2));
    },
    getSvgPos: function(event) {
      var svg = document.getElementById('mysvg'),
      pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    },
    startMouseOverSwitch: function() {
      this.vSwitch += 0.1;
    },
    finishMouseOverSwitch: function() {
      this.vSwitch -= 0.1;
    },
    startMouseOverPie: function(index) {
      if (this.status == "stop" || this.status == "pause") {
        this.highlightPieIndex = index;
      }
    },
    finishMouseOverPie: function(index) {
      this.highlightPieIndex = -1;
    }
  }
});
