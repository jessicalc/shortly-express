Shortly.Router = Backbone.Router.extend({
  initialize: function(options){
    this.$el = options.el;
  },

  routes: {
    '':       'index',
    'create': 'create'
  },

  swapView: function(view){
    this.$el.html(view.render().el);
  },

  index: function(){
    var links = new Shortly.Links();
    var linksView = new Shortly.LinksView({ collection: links });
    this.swapView(linksView);
  },

  create: function(){
    this.swapView(new Shortly.createLinkView());
  },

  // logout: function(){
  //   console.log('In backbone router!');
  //   var links = new Shortly.Links();
  //   var linksView = new Shortly.LinksView({ collection: links });
  //   this.swapView(linksView);
  // }
});
