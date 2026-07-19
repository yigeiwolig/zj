Component({
  properties: {
    active: {
      type: Number,
      value: 0
    },
    anim: {
      type: Boolean,
      value: false
    },
    /** 「我的」右上角红点：有售后待办/未读进度 */
    profileDot: {
      type: Boolean,
      value: false
    }
  },
  methods: {
    onTap(e) {
      const tab = e.currentTarget.dataset.tab;
      if (!tab) return;
      this.triggerEvent('switch', { tab });
    }
  }
});
