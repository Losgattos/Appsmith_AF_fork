export default {
    login() {
        if (!input_check.btn_signInonClick()) {
            return authorization.showError(
                "Некорректно заполнены поля Логин и/или Пароль (только буквы и цифры, до 11 символов)"
            );
        }
        authorization.signIn();
    }
}