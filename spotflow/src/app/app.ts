import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NoiseBackground } from './shared/ui/noise-background';
import { ToastStack } from './shared/ui/toast';
import { VolumeControl } from './shared/ui/volume-control';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NoiseBackground, ToastStack, VolumeControl],
  templateUrl: './app.html',
})
export class App {}
