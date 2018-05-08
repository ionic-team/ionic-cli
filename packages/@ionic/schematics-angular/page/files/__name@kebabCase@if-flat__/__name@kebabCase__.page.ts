import { Component, OnInit } from '@angular/core';
<% if(routePath) { %>import { ActivatedRoute, Params } from '@angular/router';<% } %>
@Component({
  selector: '<%= selector %>',
  templateUrl: './<%= kebabCase(name) %>.page.html',
  styleUrls: ['./<%= kebabCase(name) %>.page.<%= styleext %>'],
})
export class <%= upperFirst(camelCase(name)) %>Page implements OnInit {

  <% if(routePath) { %>public params: Params;<% } %>

  constructor(<% if(routePath) { %>private route: ActivatedRoute <% } %>) { }

  ngOnInit() {
    <% if(routePath) { %>this.params = this.route.snapshot.params;<% } %>
  }

}
