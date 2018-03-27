import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-component-<%= kebabCase(name) %>',
    templateUrl: './<%= kebabCase(name) %>.component.html',
    styleUrls: ['./<%= kebabCase(name) %>.component.<%= styleext %>'],
})
export class <%= upperFirst(camelCase(name)) %>Component implements OnInit {

    text: string;

    constructor() {
        console.log('Hello <%= kebabCase(name) %> Component');
        this.text = 'Hello World';
    }

    ngOnInit() { }
}
