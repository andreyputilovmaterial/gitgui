

import { ref, watch } from 'vue';

import openNumericRangePicker from './widget'
import logErr from '../_log_error_proxy';

const Component = {

  inheritAttrs: false,

  props: {
    // Same basic API as a native input.
    type: {
      type: String,
      default: 'datetimerange'
    },

    value: {
      type: [String, Object, Number],
      default: ''
    },

    // Vue 3 v-model API.
    modelValue: {
      type: [String, Object, Number],
      default: undefined
    }
  },

  emits: [
    'input',
    'change',
    'update:modelValue',
    'focus',
    'blur',
  ],

  template: `
    <input
      v-bind="attrs"

      :type="type"
      :value="getInputValue()"
      :readonly="true"

      @input="onInput"
      @change="onChange"
      @focus="onFocus"
      @blur="onBlur"

      ref="inputEl"

      @click="openPicker"
    />
  `,

  setup(props, { emit, attrs }) {

    function hasValue(value) {
      if( typeof value==='number' )
        return true;
      else if( typeof value==='string' )
        return !(/^\s*$/.test(value))
      else
        return !!value;
    }

    function isValidDate(value) {
      const date = new Date(value);
      return !Number.isNaN(date.getTime());
    }

    function getExternalValue() {
      if (props.modelValue !== undefined) {
        return props.modelValue;
      }
      return props.value;
    }

    const inputEl = ref(null);

    const internalValue = ref(getExternalValue());
    // { from: 1983, to: 2005 } // I am so confused with

    watch(
      () => props.modelValue,
      (value) => {
        if (value !== undefined) {
          internalValue.value = value;
        }
      }
    );

    watch(
      () => props.value,
      (value) => {
        if (props.modelValue === undefined) {
          internalValue.value = value;
        }
      }
    );

    function setValue(value) {
      internalValue.value = value;

      emit('input', makeEvent(value));
      emit('update:modelValue', value);
    }

    /*
     * Convert the application's value:
     *
     *   { from: 1983, to: 2005 }
     *
     * into the value that the actual HTML input contains:
     *
     *   "1983..2005"
     */
     function toInputValue(value) {
       if (!hasValue(value)) {
         return '';
       }
       if (typeof value === 'string') {
         return value;
       }
       if (typeof value === 'number') {
         return String(value);
       }
       if (typeof value === 'object') {
         const from = value.from ?? '';
         const to = value.to ?? '';
         if (from === '' && to === '') {
           return '';
         }
         return `${from}..${to}`;
       }
       return '';
     }

    /*
     * Convert the native input representation back into
     * the application's representation.
     *
     * "1983..2005"
     *      ↓
     * { from: 1983, to: 2005 }
     */
     function fromInputValue(value) {
       if (!hasValue(value)) {
         return null;
       }

       const parts = String(value).split('..');

       if (parts.length === 1) {
         const number = Number(parts[0]);

         if (!isValidDate(number)) {
           return null;
         }

         return {
           from: new Date(number),
           to: new Date(number),
         };
       }

       const from =
         parts[0].trim() === ''
           ? null
           : (new Date(parts[0].trim()));

       const to =
         parts[1].trim() === ''
           ? null
           : (new Date(parts[1].trim()));

       return {
         from: isValidDate(from) ? null : (new Date(from)),
         to: isValidDate(to) ? null : (new Date(to)),
       };
     }

     function makeEvent(range) {
      return {
        target: {
          value: range,
        },
      };
    }

    /*
     * `modelValue` takes precedence when the component is
     * being used with v-model.
     *
     * Otherwise behave like a normal Vue 2-style input
     * using :value + @input.
     */
    function getValue() {
      // if (props.modelValue !== undefined) {
      //   return props.modelValue;
      // }
      // return props.value;
      return internalValue.value;
    }

    function getInputValue() {
      return toInputValue(getValue());
    }

    /*
     * Emit both APIs:
     *
     *   @input="handleChange"
     *
     * receives:
     *   { from: 1983, to: 2005 }
     *
     * and:
     *
     *   v-model="range"
     *
     * is updated as well.
     */
     function emitValue(range) {
       const event = makeEvent(range);

       emit('input', event);
       emit('update:modelValue', range);

       return range;
     }

    /*
     * Normal native-input behavior.
     */
     function onInput(event) {
       emitValue(fromInputValue(event.target.value));
     }

     function onChange(event) {
       const range = fromInputValue(event.target.value);
       emit('change', makeEvent(range));
     }

    function onFocus(event) {
      emit('focus', event);
    }

    function onBlur(event) {
      emit('blur', event);
    }

    /*
     * Clicking the input opens the external picker.
     *
     * The picker is deliberately unaware of this component's
     * rendering and can be implemented however you want.
     *
     * We pass it the current range and let it return:
     *
     *   { from: 1983, to: 2005 }
     *
     * or null/undefined if cancelled.
     */
    async function openPicker(event) {
      /*
       * Don't prevent normal input behavior unless you want
       * the picker to be the only way of editing.
       */
      // const currentValue = fromInputValue(getInputValue());
      const currentValue = internalValue.value;

      let result = null;

      try {
        const validationCb = ({from,to}) => null;
        result = await openNumericRangePicker({
          value: currentValue,
          inputEl: inputEl.value || event.target,
          event,
          validationCb,
        })
      } catch(e) {
        if( e instanceof Error ) {
          logErr(e);
          logErr('Failed opening ui widget for numeric range picker');
          throw e;
        }
      }

      if (result == null) {
        return;
      };

      setValue(result);
      emit('change', makeEvent(result));
    }

    return {
      attrs,
      getInputValue,
      onInput,
      onChange,
      onFocus,
      onBlur,
      openPicker
    };
  },

};

export default Component;
