import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { <%= upperFirst(camelCase(name)) %>Page } from './<%= kebabCase(name) %>.page';

describe('<%= upperFirst(camelCase(name)) %>Page', () => {
  let component: <%= upperFirst(camelCase(name)) %>Page;
  let fixture: ComponentFixture<<%= upperFirst(camelCase(name)) %>Page>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ <%= upperFirst(camelCase(name)) %>Page ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(<%= upperFirst(camelCase(name)) %>Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
