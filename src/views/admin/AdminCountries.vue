<template>
	<div>
		<div class="admin-page-head">
			<div>
				<h1>Countries</h1>
				<p>Reference data used for player nationality.</p>
			</div>
			<div class="admin-toolbar">
				<el-input v-model="search" placeholder="Search countries" clearable style="width: 220px" :prefix-icon="Search" />
				<el-button v-if="can(Permission.COUNTRIES_CREATE)" type="primary" @click="openCreate">
					<el-icon class="me-1"><Plus /></el-icon>New country
				</el-button>
			</div>
		</div>

		<div class="admin-card">
			<el-table :data="paged" v-loading="loading" empty-text="No countries found" stripe>
				<el-table-column prop="id" label="ID" :width="isPhone ? 48 : 70" />
				<el-table-column prop="name" label="Name" min-width="180" />
				<el-table-column prop="iso_code2" label="ISO 2" width="80" />
				<el-table-column prop="iso_code3" label="ISO 3" width="80" />
				<el-table-column label="Capital" min-width="140">
					<template #default="{ row }">{{ row.capital || "–" }}</template>
				</el-table-column>
				<el-table-column label="Phone" width="100">
					<template #default="{ row }">{{ row.phone_code || "–" }}</template>
				</el-table-column>
				<el-table-column label="Continent" min-width="130">
					<template #default="{ row }">{{ row.continent || "–" }}</template>
				</el-table-column>
				<el-table-column
					v-if="canAny([Permission.COUNTRIES_UPDATE, Permission.COUNTRIES_DELETE])"
					label="Actions"
					:width="isPhone ? 112 : 170"
					align="right"
					fixed="right"
					class-name="actions-col"
				>
					<template #default="{ row }">
						<el-button v-if="can(Permission.COUNTRIES_UPDATE)" size="small" type="primary" plain aria-label="Edit" @click="openEdit(row)">
							<el-icon class="me-1"><Edit /></el-icon><span class="btn-label">Edit</span>
						</el-button>
						<el-button v-if="can(Permission.COUNTRIES_DELETE)" size="small" type="danger" plain aria-label="Delete" @click="remove(row)">
							<el-icon><Delete /></el-icon>
						</el-button>
					</template>
				</el-table-column>
			</el-table>
			<div class="d-flex justify-content-end mt-3">
				<el-pagination
					v-model:current-page="page"
					:page-size="pageSize"
					:total="filtered.length"
					layout="total, prev, pager, next"
					background
				/>
			</div>
		</div>

		<el-dialog v-model="dialogOpen" :title="editingId ? 'Edit country' : 'New country'" width="min(600px, 94vw)">
			<el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="admin-form-grid" @submit.prevent>
				<el-form-item label="Name" prop="name" class="span-2">
					<el-input v-model="form.name" />
				</el-form-item>
				<el-form-item label="ISO code (2 letters)" prop="iso_code2">
					<el-input v-model="form.iso_code2" maxlength="2" @input="form.iso_code2 = form.iso_code2.toUpperCase()" />
				</el-form-item>
				<el-form-item label="ISO code (3 letters)" prop="iso_code3">
					<el-input v-model="form.iso_code3" maxlength="3" @input="form.iso_code3 = form.iso_code3.toUpperCase()" />
				</el-form-item>
				<el-form-item label="Capital" prop="capital">
					<el-input v-model="form.capital" />
				</el-form-item>
				<el-form-item label="Phone code" prop="phone_code">
					<el-input v-model="form.phone_code" placeholder="+91" />
				</el-form-item>
				<el-form-item label="Continent" prop="continent" class="span-2">
					<el-select v-model="form.continent" filterable allow-create clearable placeholder="Choose or type">
						<el-option v-for="continent in continents" :key="continent" :label="continent" :value="continent" />
					</el-select>
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="dialogOpen = false">Cancel</el-button>
				<el-button type="primary" :loading="saving" @click="save">Save</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { Delete, Edit, Plus, Search } from "@element-plus/icons-vue";
import { adminApi } from "@/services/adminService";
import { blankToNull, confirmDelete, matchesSearch, runAction, unwrap } from "@/utils/adminHelpers";
import { useIsPhone } from "@/utils/viewport";
import { usePermissions } from "@/utils/permissions";

const isPhone = useIsPhone();
const { Permission, can, canAny } = usePermissions();

const continents = ["Africa", "Antarctica", "Asia", "Europe", "North America", "Oceania", "South America"];

const countries = ref([]);
const loading = ref(false);
const search = ref("");
const page = ref(1);
const pageSize = 15;

const filtered = computed(() =>
	countries.value.filter((country) =>
		matchesSearch(search.value, country.name, country.iso_code2, country.iso_code3, country.capital, country.continent),
	),
);
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
watch(search, () => (page.value = 1));

const load = async () => {
	loading.value = true;
	const { ok, result } = await runAction(() => adminApi.countries.list());
	countries.value = ok ? unwrap(result) || [] : [];
	loading.value = false;
};

const dialogOpen = ref(false);
const saving = ref(false);
const editingId = ref(null);
const formRef = ref(null);
const emptyForm = () => ({ name: "", iso_code2: "", iso_code3: "", capital: "", phone_code: "", continent: "" });
const form = reactive(emptyForm());

const rules = {
	name: [{ required: true, whitespace: true, message: "Name is required", trigger: "blur" }],
	iso_code2: [{ required: true, len: 2, message: "Exactly 2 letters", trigger: "blur" }],
	iso_code3: [{ required: true, len: 3, message: "Exactly 3 letters", trigger: "blur" }],
};

const openCreate = () => {
	editingId.value = null;
	Object.assign(form, emptyForm());
	dialogOpen.value = true;
	formRef.value?.clearValidate();
};

const openEdit = (country) => {
	editingId.value = country.id;
	Object.assign(form, {
		name: country.name,
		iso_code2: country.iso_code2,
		iso_code3: country.iso_code3,
		capital: country.capital || "",
		phone_code: country.phone_code || "",
		continent: country.continent || "",
	});
	dialogOpen.value = true;
	formRef.value?.clearValidate();
};

const save = async () => {
	const valid = await formRef.value.validate().catch(() => false);
	if (!valid) return;
	saving.value = true;
	const payload = blankToNull({ ...form, name: form.name.trim() });
	const { ok } = await runAction(
		() => (editingId.value ? adminApi.countries.update(editingId.value, payload) : adminApi.countries.create(payload)),
		editingId.value ? "Country updated" : "Country created",
	);
	saving.value = false;
	if (ok) {
		dialogOpen.value = false;
		await load();
	}
};

const remove = async (country) => {
	if (!(await confirmDelete(`country "${country.name}"`))) return;
	const { ok } = await runAction(() => adminApi.countries.remove(country.id), "Country deleted");
	if (ok) await load();
};

onMounted(load);
</script>
