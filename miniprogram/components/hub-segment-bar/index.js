Component({
  properties: {
    active: {
      type: String,
      value: 'home'
    },
    statusBarHeight: {
      type: Number,
      value: 44
    }
  },
  methods: {
    onTap(e) {
      const segment = e.currentTarget.dataset.segment;
      const active = this.properties.active;
      if (!segment || segment === active) return;
      this.triggerEvent('switch', { segment });
    }
  }
});
