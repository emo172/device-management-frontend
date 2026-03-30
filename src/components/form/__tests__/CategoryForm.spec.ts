import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const formComponentModules = import.meta.glob('../*.vue')

async function loadCategoryForm() {
  const loader = formComponentModules['../CategoryForm.vue']

  if (!loader) {
    return {
      module: null,
      error: new Error('CategoryForm.vue is missing'),
    }
  }

  try {
    return {
      module: (await loader()) as { default: object },
      error: null,
    }
  } catch (error) {
    return {
      module: null,
      error,
    }
  }
}

function readCategoryFormSource() {
  return readFileSync(resolve(process.cwd(), 'src/components/form/CategoryForm.vue'), 'utf-8')
}

const categoryOptions = [{ label: '测试设备', value: '测试设备' }]
const alternateCategoryOptions = [{ label: '教学设备', value: '教学设备' }]
const nestedCategoryOptions = [
  {
    label: '测试设备',
    value: '测试设备',
    children: [{ label: '高端仪器', value: '高端仪器' }],
  },
]

interface CategoryFormTestValue {
  name: string
  parentName: string | null | undefined
  sortOrder: number
  description: string
  defaultApprovalMode: string
}

type CategoryFormTestOption = {
  label: string
  value: string
  children?: CategoryFormTestOption[]
}

async function mountCategoryFormForTest(
  initialValue: CategoryFormTestValue,
  options: CategoryFormTestOption[] = categoryOptions,
  stubOptions?: {
    treeDataOnly?: boolean
    emitUndefinedOnClear?: boolean
  },
) {
  const { module, error } = await loadCategoryForm()

  expect(error).toBeNull()
  expect(module).toBeTruthy()

  if (!module) {
    throw new Error('CategoryForm.vue failed to load')
  }

  return mount(module.default, {
    props: {
      initialValue,
      categoryOptions: options,
    },
    global: {
      stubs: createCategoryFormStubs(stubOptions),
    },
  })
}

function createCategoryFormStubs(options?: {
  treeDataOnly?: boolean
  emitUndefinedOnClear?: boolean
}) {
  if (options?.treeDataOnly) {
    return {
      ElForm: { template: '<form><slot /></form>' },
      ElFormItem: { template: '<div><slot /></div>' },
      ElButton: {
        emits: ['click'],
        template: '<button @click="$emit(\'click\')"><slot /></button>',
      },
      ElInput: {
        props: ['modelValue', 'type'],
        emits: ['update:modelValue'],
        template:
          '<input :class="$attrs.class" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
      },
      ElInputNumber: {
        props: ['modelValue'],
        emits: ['update:modelValue'],
        template:
          '<input :class="$attrs.class" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
      },
      AppSelect: {
        name: 'AppSelect',
        props: ['modelValue', 'placeholder'],
        emits: ['update:modelValue'],
        template:
          '<select :class="$attrs.class" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
      },
      ElOption: {
        props: ['label', 'value'],
        template: '<option :value="value">{{ label }}</option>',
      },
      AppTreeSelect: {
        name: 'AppTreeSelect',
        props: ['data'],
        template: '<div class="category-form__parent-options">{{ JSON.stringify(data) }}</div>',
      },
    }
  }

  const clearedValue = options?.emitUndefinedOnClear ? 'undefined' : 'null'

  return {
    ElForm: { template: '<form><slot /></form>' },
    ElFormItem: { template: '<div><slot /></div>' },
    ElButton: {
      emits: ['click'],
      template: '<button @click="$emit(\'click\')"><slot /></button>',
    },
    ElInput: {
      props: ['modelValue', 'type'],
      emits: ['update:modelValue'],
      template:
        '<input :class="$attrs.class" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    },
    ElInputNumber: {
      props: ['modelValue'],
      emits: ['update:modelValue'],
      template:
        '<input :class="$attrs.class" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
    },
    AppSelect: {
      name: 'AppSelect',
      props: ['modelValue', 'placeholder'],
      emits: ['update:modelValue'],
      template:
        '<select :class="$attrs.class" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    },
    ElOption: {
      props: ['label', 'value'],
      template: '<option :value="value">{{ label }}</option>',
    },
    AppTreeSelect: {
      name: 'AppTreeSelect',
      props: {
        modelValue: { default: null },
        data: { type: Array, default: () => [] },
        nodeKey: String,
        checkStrictly: Boolean,
        defaultExpandAll: Boolean,
        clearable: Boolean,
        placeholder: String,
      },
      emits: ['update:modelValue'],
      template: `<select :class="$attrs.class" :value="modelValue ?? String()" @change="$emit('update:modelValue', $event.target.value === '' ? ${clearedValue} : $event.target.value)"><option value="">顶级分类</option><option v-for="item in data" :key="item.value" :value="item.value">{{ item.label }}</option></select>`,
    },
  }
}

describe('CategoryForm', () => {
  it('分类表单改为通过 AppTreeSelect 与 AppSelect 收口下拉，并移除局部下拉补丁', () => {
    const source = readCategoryFormSource()

    expect(source).toContain('var(--app-border-soft)')
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('<AppTreeSelect')
    expect(source).toContain('<AppSelect')
    expect(source).not.toContain('<el-tree-select')
    expect(source).not.toContain('<el-select')
    expect(source).not.toContain(':deep(.el-select__wrapper)')
  })

  it('提交分类表单时回传父级分类名称与默认审批模式', async () => {
    const { module, error } = await loadCategoryForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        initialValue: {
          name: '仪器设备',
          parentName: null,
          sortOrder: 1,
          description: '一级分类',
          defaultApprovalMode: 'DEVICE_ONLY',
        },
        categoryOptions,
      },
      global: {
        stubs: createCategoryFormStubs(),
      },
    })

    const parentTreeSelect = wrapper.getComponent({ name: 'AppTreeSelect' })
    const approvalSelect = wrapper.getComponent({ name: 'AppSelect' })

    expect(parentTreeSelect.props('clearable')).toBe(true)
    expect(parentTreeSelect.props('placeholder')).toBe('不选择则创建为顶级分类')
    expect(approvalSelect.props('placeholder')).toBe('请选择默认审批模式')

    await wrapper.get('.category-form__name').setValue('电子设备')
    await wrapper.get('.category-form__parent').setValue('测试设备')
    await wrapper.get('.category-form__approval-mode').setValue('DEVICE_THEN_SYSTEM')
    await wrapper.get('.category-form__submit').trigger('click')

    const payload = wrapper.emitted('submit')?.[0]?.[0] as
      | {
          name: string
          parentName: string | null
          sortOrder: number
          description: string
          defaultApprovalMode: string
          parentId?: string
        }
      | undefined

    expect(payload).toEqual({
      name: '电子设备',
      parentName: '测试设备',
      sortOrder: 1,
      description: '一级分类',
      defaultApprovalMode: 'DEVICE_THEN_SYSTEM',
    })
    expect(payload).not.toHaveProperty('parentId')
  })

  it('分类名称为空时不允许提交', async () => {
    const { module, error } = await loadCategoryForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        initialValue: {
          name: '',
          parentName: null,
          sortOrder: 1,
          description: '',
          defaultApprovalMode: 'DEVICE_ONLY',
        },
        categoryOptions,
      },
      global: {
        stubs: createCategoryFormStubs(),
      },
    })

    await wrapper.get('.category-form__submit').trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('父级分类选择只暴露根分类，避免提交后端不支持的非根 parentName', async () => {
    const { module, error } = await loadCategoryForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        initialValue: {
          name: '子分类',
          parentName: null,
          sortOrder: 1,
          description: '',
          defaultApprovalMode: 'DEVICE_ONLY',
        },
        categoryOptions: nestedCategoryOptions,
      },
      global: {
        stubs: createCategoryFormStubs({ treeDataOnly: true }),
      },
    })

    expect(wrapper.get('.category-form__parent-options').text()).toContain('测试设备')
    expect(wrapper.get('.category-form__parent-options').text()).not.toContain('高端仪器')
  })

  it('父级分类清空后仍保持 null，避免单选 clearable 把顶级分类误写成空字符串', async () => {
    const { module, error } = await loadCategoryForm()

    expect(error).toBeNull()
    expect(module).toBeTruthy()

    if (!module) {
      return
    }

    const wrapper = mount(module.default, {
      props: {
        initialValue: {
          name: '子分类',
          parentName: '测试设备',
          sortOrder: 1,
          description: '',
          defaultApprovalMode: 'DEVICE_ONLY',
        },
        categoryOptions,
      },
      global: {
        stubs: createCategoryFormStubs({ emitUndefinedOnClear: true }),
      },
    })

    await wrapper.get('.category-form__parent').setValue('')
    await wrapper.get('.category-form__submit').trigger('click')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      parentName: null,
    })
  })

  it.each([
    {
      caseName: '空字符串',
      parentName: '',
    },
    {
      caseName: 'undefined',
      parentName: undefined,
    },
  ])('initialValue.parentName 为$caseName时会在同步与提交阶段归一成 null', async ({ parentName }) => {
    const wrapper = await mountCategoryFormForTest({
      name: '子分类',
      parentName,
      sortOrder: 1,
      description: '',
      defaultApprovalMode: 'DEVICE_ONLY',
    })

    expect(wrapper.getComponent({ name: 'AppTreeSelect' }).props('modelValue')).toBeNull()

    await wrapper.get('.category-form__submit').trigger('click')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      parentName: null,
    })
  })

  it.each([
    {
      caseName: '非根分类名',
      parentName: '高端仪器',
      options: nestedCategoryOptions,
    },
    {
      caseName: '历史脏值',
      parentName: '历史脏值',
      options: categoryOptions,
    },
  ])('initialValue.parentName 为$caseName时会在同步与提交阶段归一成 null', async ({ parentName, options }) => {
    const wrapper = await mountCategoryFormForTest(
      {
        name: '子分类',
        parentName,
        sortOrder: 1,
        description: '',
        defaultApprovalMode: 'DEVICE_ONLY',
      },
      options,
    )

    expect(wrapper.getComponent({ name: 'AppTreeSelect' }).props('modelValue')).toBeNull()

    await wrapper.get('.category-form__submit').trigger('click')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      parentName: null,
    })
  })

  it.each([
    {
      caseName: '空字符串',
      nextParentName: '',
      nextOptions: categoryOptions,
    },
    {
      caseName: 'undefined',
      nextParentName: undefined,
      nextOptions: categoryOptions,
    },
    {
      caseName: '非根分类名',
      nextParentName: '高端仪器',
      nextOptions: nestedCategoryOptions,
    },
    {
      caseName: '历史脏值',
      nextParentName: '历史脏值',
      nextOptions: categoryOptions,
    },
  ])('props 更新后二次同步到$caseName时仍会把 parentName 收敛成 null', async ({ nextParentName, nextOptions }) => {
    const wrapper = await mountCategoryFormForTest({
      name: '子分类',
      parentName: '测试设备',
      sortOrder: 1,
      description: '',
      defaultApprovalMode: 'DEVICE_ONLY',
    })

    await wrapper.setProps(
      {
        initialValue: {
          name: '子分类',
          parentName: nextParentName,
          sortOrder: 1,
          description: '',
          defaultApprovalMode: 'DEVICE_ONLY',
        },
        categoryOptions: nextOptions,
      } as never,
    )

    expect(wrapper.getComponent({ name: 'AppTreeSelect' }).props('modelValue')).toBeNull()

    await wrapper.get('.category-form__submit').trigger('click')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      parentName: null,
    })
  })

  it('props 更新 initialValue 时会整体覆盖用户已编辑字段，并继续按当前归一规则同步', async () => {
    const wrapper = await mountCategoryFormForTest({
      name: '初始分类',
      parentName: null,
      sortOrder: 1,
      description: '初始描述',
      defaultApprovalMode: 'DEVICE_ONLY',
    })

    await wrapper.get('.category-form__name').setValue('用户编辑名称')
    await wrapper.get('.category-form__sort-order').setValue('8')
    await wrapper.get('.category-form__description').setValue('用户编辑描述')
    await wrapper.get('.category-form__approval-mode').setValue('DEVICE_THEN_SYSTEM')
    await wrapper.get('.category-form__parent').setValue('测试设备')

    await wrapper.setProps(
      {
        initialValue: {
          name: '服务端回填名称',
          parentName: '历史脏值',
          sortOrder: 3,
          description: '服务端回填描述',
          defaultApprovalMode: 'DIRTY_MODE',
        },
      } as never,
    )

    expect((wrapper.get('.category-form__name').element as HTMLInputElement).value).toBe(
      '服务端回填名称',
    )
    expect(Number((wrapper.get('.category-form__sort-order').element as HTMLInputElement).value)).toBe(3)
    expect((wrapper.get('.category-form__description').element as HTMLInputElement).value).toBe(
      '服务端回填描述',
    )
    expect(wrapper.getComponent({ name: 'AppTreeSelect' }).props('modelValue')).toBeNull()
    expect(wrapper.getComponent({ name: 'AppSelect' }).props('modelValue')).toBe('DEVICE_ONLY')

    await wrapper.get('.category-form__submit').trigger('click')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      name: '服务端回填名称',
      parentName: null,
      sortOrder: 3,
      description: '服务端回填描述',
      defaultApprovalMode: 'DEVICE_ONLY',
    })
  })

  it('根分类选项变化导致当前 parentName 失效时，会在二次同步与提交阶段归一成 null', async () => {
    const wrapper = await mountCategoryFormForTest({
      name: '子分类',
      parentName: '测试设备',
      sortOrder: 1,
      description: '',
      defaultApprovalMode: 'DEVICE_ONLY',
    })

    await wrapper.setProps({
      categoryOptions: alternateCategoryOptions,
    } as never)

    expect(wrapper.getComponent({ name: 'AppTreeSelect' }).props('modelValue')).toBeNull()

    await wrapper.get('.category-form__submit').trigger('click')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      parentName: null,
    })
  })

  it('仅 categoryOptions 变化导致当前 parentName 失效时，不会重置用户已编辑的其他字段', async () => {
    const wrapper = await mountCategoryFormForTest({
      name: '初始分类',
      parentName: '测试设备',
      sortOrder: 1,
      description: '初始描述',
      defaultApprovalMode: 'DEVICE_ONLY',
    })

    await wrapper.get('.category-form__name').setValue('已编辑分类')
    await wrapper.get('.category-form__sort-order').setValue('9')
    await wrapper.get('.category-form__description').setValue('已编辑描述')
    await wrapper.get('.category-form__approval-mode').setValue('DEVICE_THEN_SYSTEM')

    await wrapper.setProps({
      categoryOptions: alternateCategoryOptions,
    } as never)

    expect((wrapper.get('.category-form__name').element as HTMLInputElement).value).toBe('已编辑分类')
    expect(Number((wrapper.get('.category-form__sort-order').element as HTMLInputElement).value)).toBe(9)
    expect((wrapper.get('.category-form__description').element as HTMLInputElement).value).toBe(
      '已编辑描述',
    )
    expect(wrapper.getComponent({ name: 'AppSelect' }).props('modelValue')).toBe('DEVICE_THEN_SYSTEM')
    expect(wrapper.getComponent({ name: 'AppTreeSelect' }).props('modelValue')).toBeNull()

    await wrapper.get('.category-form__submit').trigger('click')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      name: '已编辑分类',
      parentName: null,
      sortOrder: 9,
      description: '已编辑描述',
      defaultApprovalMode: 'DEVICE_THEN_SYSTEM',
    })
  })

  it('仅 categoryOptions 变化但仍包含当前 parentName 时，会保留用户已编辑字段与合法父级分类', async () => {
    const wrapper = await mountCategoryFormForTest({
      name: '初始分类',
      parentName: '测试设备',
      sortOrder: 1,
      description: '初始描述',
      defaultApprovalMode: 'DEVICE_ONLY',
    })

    await wrapper.get('.category-form__name').setValue('已编辑分类')
    await wrapper.get('.category-form__sort-order').setValue('6')
    await wrapper.get('.category-form__description').setValue('保留已编辑描述')
    await wrapper.get('.category-form__approval-mode').setValue('DEVICE_THEN_SYSTEM')

    await wrapper.setProps({
      categoryOptions: nestedCategoryOptions,
    } as never)

    expect((wrapper.get('.category-form__name').element as HTMLInputElement).value).toBe('已编辑分类')
    expect(Number((wrapper.get('.category-form__sort-order').element as HTMLInputElement).value)).toBe(6)
    expect((wrapper.get('.category-form__description').element as HTMLInputElement).value).toBe(
      '保留已编辑描述',
    )
    expect(wrapper.getComponent({ name: 'AppSelect' }).props('modelValue')).toBe('DEVICE_THEN_SYSTEM')
    expect(wrapper.getComponent({ name: 'AppTreeSelect' }).props('modelValue')).toBe('测试设备')

    await wrapper.get('.category-form__submit').trigger('click')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      name: '已编辑分类',
      parentName: '测试设备',
      sortOrder: 6,
      description: '保留已编辑描述',
      defaultApprovalMode: 'DEVICE_THEN_SYSTEM',
    })
  })

  it('initialValue.defaultApprovalMode 非法时会在同步与提交阶段回退到 DEVICE_ONLY', async () => {
    const wrapper = await mountCategoryFormForTest({
      name: '子分类',
      parentName: null,
      sortOrder: 1,
      description: '',
      defaultApprovalMode: 'DIRTY_MODE',
    })

    expect(wrapper.getComponent({ name: 'AppSelect' }).props('modelValue')).toBe('DEVICE_ONLY')

    await wrapper.get('.category-form__submit').trigger('click')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      defaultApprovalMode: 'DEVICE_ONLY',
    })
  })

  it('props 更新后二次同步到非法审批模式时仍会回退到 DEVICE_ONLY', async () => {
    const wrapper = await mountCategoryFormForTest({
      name: '子分类',
      parentName: null,
      sortOrder: 1,
      description: '',
      defaultApprovalMode: 'DEVICE_THEN_SYSTEM',
    })

    await wrapper.setProps(
      {
        initialValue: {
          name: '子分类',
          parentName: null,
          sortOrder: 1,
          description: '',
          defaultApprovalMode: 'DIRTY_MODE',
        },
      } as never,
    )

    expect(wrapper.getComponent({ name: 'AppSelect' }).props('modelValue')).toBe('DEVICE_ONLY')

    await wrapper.get('.category-form__submit').trigger('click')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      defaultApprovalMode: 'DEVICE_ONLY',
    })
  })
})
