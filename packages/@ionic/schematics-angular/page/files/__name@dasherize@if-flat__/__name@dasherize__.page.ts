import { Component, OnInit } from '@angular/core';<% if(routePath) { %>
import { ActivatedRoute, Params } from '@angular/router';<% } %>

@Component({
  selector: '<%= selector %>',
  templateUrl: './<%= dasherize(name) %>.page.html',
  styleUrls: ['./<%= dasherize(name) %>.page.<%= styleext %>'],
})
export class <%= classify(name) %>Page implements OnInit {<% if(routePath) { %>

  params: Params;<% } %>

  constructor(<% if(routePath) { %>private route: ActivatedRoute<% } %>) { }

  ngOnInit() {<% if(routePath) { %>
    this.params = this.route.snapshot.params;<% } %>
  }

}
