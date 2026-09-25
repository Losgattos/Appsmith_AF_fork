export default {
    btn_signInonClick() {
        const loginOk    = /^[a-zA-Z0-9]{1,11}$/.test(login.text);
        const passwordOk = /^[a-zA-Z0-9]{1,11}$/.test(password.text);
        return loginOk && passwordOk;
    }
}