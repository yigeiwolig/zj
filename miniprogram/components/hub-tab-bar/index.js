Component({
  properties: {
    active: {
      type: Number,
      value: 0
    },
    anim: {
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
