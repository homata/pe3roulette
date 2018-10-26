var vm = new Vue({
  el: '#roulette',
  data: {
    cx: 100,
    cy: 50,
    r: 50,
    sr: 20,
    number: 10,
    numbers: [1,2,3,4,5,6,7,8,9,10],
    dragStartPos: {x: 0, y: 0},
    movePos: {x: 0, y: 0},
    dragIndex: -1,
    dragPos: [],
    focusItem: null,
    focusIndex: 0,
    interval: 10,
    editing: false,
    status: "stop"  // stop / running / breaking / pause
  },
  watch: {
    number: function(newValue, oldValue) {
      var numbers = [];
      for (var i = 0; i < this.number; i++) {
        numbers.push(i+1);
      }
      this.numbers = numbers;
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
        var fill = hsvToRgb(i * 360 / this.numbers.length, 1, 1);
        var textX = this.cx + this.r * 0.9 * Math.cos(-(i + 0.5) * th);
        var textY = this.cy + this.r * 0.9 * Math.sin(-(i + 0.5) * th);
        items.push(
          {
            d: d,
            fill: fill,
            textX: textX,
            textY: textY,
            text: this.numbers[i]
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
        this.dragPos = [];
        this.numbers.splice(this.dragIndex, 1);
        this.dragIndex = -1;
      }
    },
    switchRoulette: function(event) {
      // ルーレット停止または一時停止
      if (this.status == "stop" || this.status == "pause") {
        // ルーレット開始
        this.interval = 50;
        this.status = "running";
        var self = this;
        setTimeout(function countDown() {
          beep();
          if (self.focusIndex > 0) {
            self.focusIndex--;
          } else {
            self.focusIndex = self.numbers.length - 1;
          }
          self.focusItem = self.items[self.focusIndex].d;
          // ブレーキ中はインターバルを増やしていく
          if (self.status == "breaking") {
            self.interval += 8;
          }
          // ルーレット一時停止
          if (self.interval > 480) {
            self.status = "pause";
            return;
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
    }
  }
});
