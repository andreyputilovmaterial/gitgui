
import { onMounted, onUnmounted, reactive, } from 'vue';




const validate = (cb,interval) => (interval>0) && (typeof cb==='function');

function useInterval(cb,interval) {
    if(!validate(cb,interval))
        throw new Error(`useInterval: incorrect params: ( ${cb}, ${interval} )`);
    const intervalId = reactive({value:undefined,});
    onMounted(()=>{
        intervalId.value = setInterval(cb,interval);
    });
    onUnmounted(()=>{
        clearInterval(intervalId.value);
    });
}

export default useInterval;
