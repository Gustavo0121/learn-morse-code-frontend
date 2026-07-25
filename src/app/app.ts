import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Footer } from './shared/layout/footer';
import { Header } from './shared/layout/header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
