import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { <%= upperFirst(camelCase(name)) %>Page } from './<%= kebabCase(name) %>.page';

const routes: Routes = [
  {
    path: '',
    component: <%= upperFirst(camelCase(name)) %>Page
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [<%= upperFirst(camelCase(name)) %>Page]
})
export class <%= upperFirst(camelCase(name)) %>PageModule {}
