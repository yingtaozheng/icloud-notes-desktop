// Builds a script that runs inside Apple's sign-in iframe (idmsa.apple.com) and fills
// in the Apple ID and password. It polls because the form renders asynchronously and
// switches from the account step to the password step without a page load.
module.exports = function buildAutofillScript(appleId, password) {
  return `(${autofill.toString()})(${JSON.stringify(appleId)}, ${JSON.stringify(password)});`;
};

function autofill(appleId, password) {
  if (window.__notesAutofill) return;
  window.__notesAutofill = true;

  // Sign-in fields are framework-controlled, so set the value through the native
  // setter and fire input events so the framework notices the change.
  const setValue = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const isVisible = (el) => el && el.offsetParent !== null;
  const submit = () => {
    const button = document.querySelector('#sign-in');
    if (button && !button.disabled) button.click();
  };

  let accountDone = false;
  let passwordDone = false;
  let ticks = 0;

  const timer = setInterval(() => {
    if (++ticks > 120 || passwordDone) return clearInterval(timer);

    const remember = document.querySelector('#remember-me');
    if (remember && !remember.checked) remember.click();

    const account = document.querySelector('#account_name_text_field');
    const pwd = document.querySelector('#password_text_field');

    // Current form shows both fields at once: fill both and submit once.
    if (!accountDone && isVisible(account) && isVisible(pwd)) {
      setValue(account, appleId);
      setValue(pwd, password);
      accountDone = passwordDone = true;
      setTimeout(submit, 300);
      return;
    }

    // Older two-step form: account first, password appears after continuing.
    if (!accountDone && isVisible(account)) {
      setValue(account, appleId);
      accountDone = true;
      setTimeout(submit, 300);
      return;
    }

    // Accounts with passkeys get a "Continue with Password" choice first.
    const usePassword = document.querySelector('#continue-password');
    if (accountDone && isVisible(usePassword) && !isVisible(pwd)) {
      usePassword.click();
      return;
    }

    if (accountDone && isVisible(pwd)) {
      setValue(pwd, password);
      passwordDone = true;
      setTimeout(submit, 300);
    }
  }, 500);
}
