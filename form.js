/**
 * Form
 * @param {HTMLElement} element 
 * @param {? { ignoreClassInputStartWithCharacter: ?string[], watch: ?boolean }} options 
 */
function Form(element, options) {
    this.element = element;
    options = options || {};

    this.options = Object.assign(
        {
            ignoreClassInputStartWithCharacter: [],
            watch: false,
        },
        options
    );

    const utils = {
        closestRequired: (el) => {
            while (el && el !== this.element) {
                if (el?.classList.contains('require')) {
                    return el;
                }
                el = el.parentNode;
            }
            return null;
        },
        _translate: (message) => {
            return typeof translate[message] !== 'undefined'
                ? translate[message]
                : message;
        },
        /**
         * 
         * @param {HTMLElement} container 
         */
        removeMessage: (container) => {
            let msg = container.parentNode.querySelector('.error-message');
            if (msg) container.parentNode.removeChild(msg);
        },
        showMessage: (container, message) => {
            let msg = document.createElement('div');
            msg.className = 'error-message fade-in';
            msg.textContent = utils._translate(message);
            
            container.after(msg);
        },
        scrollToView: (element) => {
            let top = element.getBoundingClientRect().top + window.pageYOffset - 20;
            window.scrollTo({
                top: top,
                behavior: 'smooth',
            });
        },
        isFieldValid: (field)=> {
            let value = (field.value || '').trim();
            if (field.type === 'checkbox' || field.type === 'radio') {
                let group = this.element.querySelectorAll('input[name="' + field.name + '"]');
                for (const element of group) {
                    if (element.checked) return true;
                }
                return false;
            }
        
            if (field.tagName.toLowerCase() === 'select') {
                return value !== '';
            }
        
            return value !== '';
        },        
        isEmptySelected: (value) => {
            return value === '' || value === null;
        },
        isEmptyRadioOrCheckbox: (field) => {
            let group = this.element.querySelectorAll('input[name="' + field.name + '"]');
            let isChecked = false;
            for (const element of group) {
                if (element.checked) {
                    isChecked = true;
                    break;
                }
            }
            return !isChecked;
        },
        /** 
         * Validate format phone number
         * @param {string} value 
         * @returns {{ errorMessage: string, invalid: boolean }}
         */
        isValidPhoneNumber: (value) => {
            let results = {
                errorMessage: 'Please enter phone number',
                invalid: false,
            };
            value = value.replace(/\s+/g, '');
            if (value.length <= 0) {
                results.invalid = true
            } else if (value.length < 10) {
                results.invalid = true;
                results.errorMessage = 'Please enter a valid phone number';
            } else {
                let digits = value.replace(/\D/g, '');
                results.invalid = digits.length > 0 && !digits.startsWith('0');
                results.errorMessage = 'Invalid phone number';
            }
            return results;
        },
        /**
         * Validate email format
         * @param {string} email 
         * @returns {{ errorMessage: string, invalid: boolean }}
         */
        isValidateEmail: (email) => {
            let results = {
                errorMessage: 'Please enter email',
                invalid: false,
            };
            if (email.length <= 0) {
                results.invalid = true
            } else {
                let reg = new RegExp(/^[a-zA-Z0-9_\.\-]+\@([a-zA-Z0-9\-]+\.)+[a-zA-Z0-9]{2,4}$/);
                results.invalid = !reg.test(email);
                results.errorMessage = 'Invalid email format';
            }
            
            return results;
        },
        /**
         * 
         * @param {string} value 
         * @param {?string} defaultMessage 
         */
        isValidText: (value, defaultMessage, ignoreStartWithCharacter) => {
            ignoreStartWithCharacter = ignoreStartWithCharacter || false
            
            let results = {
                errorMessage: typeof defaultMessage !== 'undefined' ? defaultMessage : '',
                invalid: false,
            }

            if (ignoreStartWithCharacter) {
                results.invalid = value.length <= 0;
            } else if (value.length <= 0 ) {
                results.invalid = true;
            } else {
                let firstChar = value.charAt(0);
                results.invalid = !/^[\p{L} ]+$/u.test(firstChar);
            }

            if (results.invalid) {
                results.errorMessage = 'Invalid format';
            }
            return results;
        },
        clearForm: () => {
            let elements = this.element.querySelectorAll('input:not([type="hidden"]), textarea, select');
            for (const element of elements) {
                let el = element;
                let type = el.type;

                if (type === 'checkbox' || type === 'radio') {
                    el.checked = false;
                } else if (el.tagName.toLowerCase() === 'select') {
                    el.selectedIndex = 0;
                } else {
                    el.value = '';
                }
            }
        },
    };

    const attachLiveValidation = (form) => {
        const utils = this.utils;
        const options = this.options;
        
        if (typeof form === 'undefined') {
            form = this.element
        }
        let fields = form.querySelectorAll(
            'input.require, textarea.require, select.require'
        );

        for (const element of fields) {
            (function (field) {
                let type = field.type;
                let eventType =
                    type === 'checkbox' ||
                    type === 'radio' ||
                    type === 'select-one'
                        ? 'change'
                        : 'blur';

                field.addEventListener(eventType, function () {
                    validateSingleField(field);
                });

                let liveEvent =
                    type === 'checkbox' ||
                    type === 'radio' ||
                    type === 'select-one'
                        ? 'change'
                        : 'input';

                field.addEventListener(liveEvent, function () {
                    if (utils.isFieldValid(field)) {
                        let container = utils.closestRequired(field);
                        
                        if (container) {
                            container.classList.remove('invalid');
                            utils.removeMessage(container);
                        }
                    }
                });
            })(element);
        }

        function validateSingleField(field) {
            let value = (field.value || '').trim();
            let container = utils.closestRequired(field);
            if (!container) return;

            container.classList.remove('invalid');
            utils.removeMessage(container);

            let isInvalid = false;
            let message = field.getAttribute('data-error') || '';

            const ignoreStartWithCharacter =
                options.ignoreClassInputStartWithCharacter.length > 0
                    ? Array.from(field.classList).some((cls) =>
                          options.ignoreClassInputStartWithCharacter.includes(
                              cls
                          )
                      )
                    : false;

            if (field.type === 'checkbox' || field.type === 'radio') {
                isInvalid = utils.isEmptyRadioOrCheckbox(field);
            } else if (field.tagName.toLowerCase() === 'select') {
                isInvalid = utils.isEmptySelected(value);
            } else if (field.inputMode === 'email') {
                let objValidEmail = utils.isValidateEmail(value);
                isInvalid = objValidEmail.invalid;
                message = objValidEmail.errorMessage;
            } else if (field.inputMode === 'tel') {
                let objValidPhoneNumber = utils.isValidPhoneNumber(value);
                isInvalid = objValidPhoneNumber.invalid;
                message = objValidPhoneNumber.errorMessage;
            } else if (field.type === 'text') {
                let objValidText = utils.isValidText(value, message, ignoreStartWithCharacter);
                isInvalid = objValidText.invalid;
                message = objValidText.errorMessage;
            }

            if (isInvalid) {
                container.classList.add('invalid');

                utils.showMessage(container, message);
            }
        }
    }

    const serializeFormToObject =  (form) => {
        if (typeof form === 'undefined') {
            form = this.element;
        }
        let data = {};
        let elements = form.elements;

        const multi = function (options) {
            let values = [];
            for (const element of options) {
                if (element.selected) {
                    values.push(element.value);
                }
            }
            data[el.name] = values;
        };

        for (const element of elements) {
            let el = element;
            if (
                !el.name ||
                el.disabled ||
                ['file', 'reset', 'submit', 'button'].indexOf(el.type) > -1
            ) {
                continue;
            }

            if (el.type === 'select-multiple') {
                multi(el.options);
            } else if (el.type === 'select-one') {
                data[el.name] = el.value;
            } else if (
                (el.type === 'checkbox' || el.type === 'radio') &&
                !el.checked
            ) {
                continue;
            } else {
                data[el.name] = el.value;
            }
        }

        return data;
    };

    const validateRequiredFields = (form)=> {
        if (typeof form === 'undefined') {
            form = this.element;
        }
        let valid = true;
        let fields = form.querySelectorAll(
            'input.require, textarea.require, select.require'
        );
        let firstInvalidShown = false;
        let firstInvalidElement = null;

        const setValidInput = (container, field, isEmpty, extendMessage, defaultValid) => {
            if (isEmpty) {
                if (container) container.classList.add('invalid');

                if (!firstInvalidShown && container) {
                    let customMsg = field.getAttribute('data-error') || 'This field is required';
                    
                    if (typeof extendMessage !== 'undefined') {
                        customMsg = extendMessage;
                    }
                    
                    this.utils.showMessage(container, customMsg);
                    firstInvalidShown = true;
                    firstInvalidElement = container;
                }

                return false;
            }
            return defaultValid;
        };

        for (const element of fields) {
            let field = element;
            let type = field.type;
            let value = (field.value || '').trim();
            const inputMode = field.getAttribute('inputmode');

            let container = this.utils.closestRequired(field);
            if (container) {
                container.classList.remove('invalid');
                this.utils.removeMessage(container);
            }

            let isInvalid = false;
            let errorMessage = field.getAttribute('data-error') || '';
        
            const ignoreStartWithCharacter =
                this.options.ignoreClassInputStartWithCharacter.length > 0
                    ? Array.from(field.classList).some((cls) =>
                          this.options.ignoreClassInputStartWithCharacter.includes(
                              cls
                          )
                      )
                    : false;

            if (type === 'checkbox' || type === 'radio') {
                isInvalid = this.utils.isEmptyRadioOrCheckbox(field);
            } else if (field.tagName.toLowerCase() === 'select') {
                isInvalid = this.utils.isEmptySelected(value);
            } else if (inputMode === 'email') {
                let objValidEmail = this.utils.isValidateEmail(value);
                isInvalid = objValidEmail.invalid;
                errorMessage = objValidEmail.errorMessage;
            } else if (inputMode === 'tel') {
                let objValidPhoneNumber = this.utils.isValidPhoneNumber(value);
                isInvalid = objValidPhoneNumber.invalid;
                errorMessage = objValidPhoneNumber.errorMessage;
            } else if (type === 'text') {
                let objValidText = this.utils.isValidText(value.trim(), errorMessage, ignoreStartWithCharacter);
                isInvalid = objValidText.invalid;
                errorMessage = objValidText.errorMessage;
            }

            valid = setValidInput(container, field, isInvalid, errorMessage, valid);
        }

        if (!valid && firstInvalidElement) {
            // this.utils.scrollToView(firstInvalidElement);
        }

        return valid;
    }

    this.utils = utils;
    this.fn = {
        serializeFormToObject: serializeFormToObject,
        validateRequiredFields: validateRequiredFields,
        attachLiveValidation: attachLiveValidation,
    };

    
    if (this.options.watch) attachLiveValidation(this.element);
}
