// Shared form validation for Element Plus forms: validate, focus the first bad field, and list the problems.
//
//   const { submitting, validate, submit } = useFormSubmit(formRef);
//   const errors = ref([]);
//   const save = () => submit(async () => {
//       const check = await validate();          // focuses the first invalid field
//       errors.value = check.errors;
//       if (!check.valid) return;
//       await api.save(form);
//   });
//
// The guard in submit() stops a second click while the first request is still running.

import { ref } from "vue";

const FIELD_SELECTOR = "input, textarea, select, [contenteditable='true'], .el-select, .el-date-editor, [role='combobox']";

// Element Plus does not put the prop on the DOM, so each validated form item carries data-prop="<prop>".
const labelOf = (item) => item?.querySelector(".el-form-item__label")?.textContent?.trim() || "";

/** Focus the control inside a form item, scrolling it into view first. */
export function focusFormItem(item) {
	if (!item) return false;
	item.scrollIntoView({ block: "center", behavior: "smooth" });
	const control = item.querySelector(FIELD_SELECTOR);
	const target = control?.matches?.("input, textarea, select, [contenteditable='true'], [role='combobox']")
		? control
		: control?.querySelector?.("input, textarea, [role='combobox']") || control;
	if (target && typeof target.focus === "function") {
		target.focus({ preventScroll: true });
		return true;
	}
	return false;
}

/** Focus the field for a prop name (e.g. "email"). Used by error summaries. */
export function focusField(formRef, prop) {
	const formEl = formRef?.value?.$el ?? formRef?.value;
	const item = formEl?.querySelector?.(`.el-form-item[data-prop="${CSS.escape(prop)}"]`) || null;
	if (item) return focusFormItem(item);
	return false;
}

/** The first invalid form item in DOM order, which is the order a user reads the form. */
export function firstInvalidItem(formEl) {
	return formEl?.querySelector?.(".el-form-item.is-error") || null;
}

/**
 * Validate an Element Plus form. Returns { valid, errors } where errors lists each invalid
 * field in on-screen order: { prop, label, message }. The first invalid field gets focus.
 */
export async function validateForm(formRef) {
	const form = formRef?.value;
	if (!form) return { valid: true, errors: [] };
	const formEl = form.$el;
	try {
		await form.validate();
		return { valid: true, errors: [] };
	} catch (invalidFields) {
		const errors = orderedErrors(formEl, invalidFields);
		const first = firstInvalidItem(formEl);
		// Validation runs while the submit guard still disables the inputs. Focus after that render.
		if (first) setTimeout(() => focusFormItem(first), 0);
		return { valid: false, errors };
	}
}

// Element Plus reports invalid fields as { prop: [{ message }] }. Put them in screen order.
export function orderedErrors(formEl, invalidFields) {
	const found = [];
	Object.entries(invalidFields || {}).forEach(([prop, rules]) => {
		const message = Array.isArray(rules) && rules[0]?.message ? rules[0].message : "This field is not valid.";
		found.push({ prop, label: "", message });
	});
	const items = [...(formEl?.querySelectorAll?.(".el-form-item") || [])];
	found.forEach((error) => {
		const item = items.find((candidate) => candidate.dataset.prop === error.prop);
		error.label = labelOf(item) || error.prop;
	});
	const position = (error) => {
		const index = items.findIndex((candidate) => candidate.dataset.prop === error.prop);
		return index === -1 ? Number.MAX_SAFE_INTEGER : index;
	};
	return found.sort((a, b) => position(a) - position(b));
}

/**
 * Wrap a form submit so a second click during the request is ignored.
 * The returned `validate` runs the form check; `submit` runs the action once.
 */
export function useFormSubmit(formRef) {
	const submitting = ref(false);

	const validate = () => validateForm(formRef);

	const submit = async (action) => {
		if (submitting.value) return undefined;
		submitting.value = true;
		try {
			return await action();
		} finally {
			submitting.value = false;
		}
	};

	return { submitting, validate, submit };
}
