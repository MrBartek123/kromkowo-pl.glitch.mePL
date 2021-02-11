import Canvas from './Canvas.js';
import Form from './Form.js';

window.addEventListener('load', () => {
    new Canvas('#bg-anim', '.header');
    new Form('.form');  
});
