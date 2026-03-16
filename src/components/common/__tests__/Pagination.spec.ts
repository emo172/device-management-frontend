import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

const paginationModules = import.meta.glob('../*.vue')

async function loadPaginationComponent() {
  const loader = paginationModules['../Pagination.vue']

  if (!loader) {
    return {
      component: null,
      error: new Error('Pagination.vue is missing'),
    }
  }

  try {
    const module = (await loader()) as { default: object }

    return {
      component: module.default,
      error: null,
    }
  } catch (error) {
    return {
      component: null,
      error,
    }
  }
}

describe('Pagination', () => {
  it('透传分页参数并把页码与每页条数变化回抛给父层', async () => {
    const { component, error } = await loadPaginationComponent()

    expect(error).toBeNull()
    expect(component).toBeTruthy()

    if (!component) {
      return
    }

    const wrapper = mount(component, {
      props: {
        currentPage: 2,
        pageSize: 20,
        total: 88,
      },
      global: {
        stubs: {
          ElPagination: {
            props: ['currentPage', 'pageSize', 'total'],
            emits: ['update:current-page', 'update:page-size', 'size-change', 'current-change'],
            template:
              '<div><button class="page" @click="$emit(\'update:current-page\', 3); $emit(\'current-change\', 3)"></button><button class="size" @click="$emit(\'update:page-size\', 50); $emit(\'size-change\', 50)"></button><span class="snapshot">{{ currentPage }}-{{ pageSize }}-{{ total }}</span></div>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('2-20-88')

    await wrapper.get('.page').trigger('click')
    await wrapper.get('.size').trigger('click')

    expect(wrapper.emitted('update:current-page')).toEqual([[3]])
    expect(wrapper.emitted('update:page-size')).toEqual([[50]])
    expect(wrapper.emitted('change')).toEqual([
      [{ currentPage: 3, pageSize: 20 }],
      [{ currentPage: 2, pageSize: 50 }],
    ])
  })
})
