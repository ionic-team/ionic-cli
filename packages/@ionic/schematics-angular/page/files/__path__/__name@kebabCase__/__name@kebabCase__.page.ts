import { Component, OnInit } from '@angular/core';

@Component({
    selector: '<%= kebabCase(name) %>-page',
    templateUrl: './<%= kebabCase(name) %>.page.html',
    styleUrls: ['./<%= kebabCase(name) %>.page.<%= styleext %>'],
})
export class <%= upperFirst(camelCase(name)) %>Page implements OnInit {

    constructor() { }

    ngOnInit() { }

}
