import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { <%= upperFirst(camelCase(name)) %>Component } from './<%= kebabCase(name) %>.component';

describe('<%= upperFirst(camelCase(name)) %>Component', () => {
  let component: <%= upperFirst(camelCase(name)) %>Component;
  let fixture: ComponentFixture<<%= upperFirst(camelCase(name)) %>Component>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ <%= upperFirst(camelCase(name)) %>Component ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(<%= upperFirst(camelCase(name)) %>Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
