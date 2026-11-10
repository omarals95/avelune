import './src/polyfill';
// Must run before the store module loads (see demo.ts).
import './src/demo';
import { registerRootComponent } from 'expo';
import App from './src/App';

registerRootComponent(App);
