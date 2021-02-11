class Form {
    constructor(selector) {
        this.selector = selector;
        this.inputs = [...document.querySelectorAll(`${selector} input`)];

        this.animatedInputs();
    }

    animatedInputs() {
        this.inputs.map(input => {
            this.checkInputFocusState(input);
            this.checkInputActiveState(input);
    
            input.addEventListener('keyup', () => {
                this.checkInputActiveState(input);
            });
        });
    }

    checkInputActiveState(input) {
        if (input.value) {
            input.parentElement.classList.add('active');
            return;
        } 
    
        input.parentElement.classList.remove('active');
    }
    
    checkInputFocusState(input) {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
    
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    }
}

export default Form;
