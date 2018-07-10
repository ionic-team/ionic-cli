import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { <%= classify(name) %>Page } from './<%= dasherize(name) %>.page';

const routes: Routes = [
  {
    path: '',
    component: <%= classify(name) %>Page
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [<%= classify(name) %>Page]
})
export class <%= classify(name) %>PageModule {}
