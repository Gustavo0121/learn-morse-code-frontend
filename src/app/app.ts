import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Button } from './shared/ui/button/button';
import { Divider } from './shared/ui/divider/divider';
import { Heading } from './shared/ui/heading/heading';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Button, Divider, Heading],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
