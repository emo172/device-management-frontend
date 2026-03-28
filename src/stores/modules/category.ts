import { defineStore } from 'pinia'

import * as categoryApi from '@/api/categories'

interface CategoryOption {
  label: string
  value: string
  children?: CategoryOption[]
}

interface CategoryState {
  tree: categoryApi.CategoryTreeResponse[]
  loading: boolean
  submitting: boolean
}

function createDefaultState(): CategoryState {
  return {
    tree: [],
    loading: false,
    submitting: false,
  }
}

function mapCategoryTreeToOptions(tree: categoryApi.CategoryTreeResponse[]): CategoryOption[] {
  return tree.map((item) => ({
    label: item.name,
    value: item.name,
    children: item.children.length ? mapCategoryTreeToOptions(item.children) : undefined,
  }))
}

function mapRootCategoryToOptions(tree: categoryApi.CategoryTreeResponse[]): CategoryOption[] {
  return tree.map((item) => ({
    label: item.name,
    value: item.name,
  }))
}

/**
 * 设备分类域状态。
 * 设备表单、分类管理页都依赖同一份分类树与树形选项，统一放进 Store 可以避免页面各自重复拉取并手工转换树数据。
 */
export const useCategoryStore = defineStore('category', {
  state: (): CategoryState => createDefaultState(),

  getters: {
    /**
     * 设备表单需要用分类名称作为提交值，因此树形选择器的 value 统一映射为分类名称，而不是分类 ID。
     */
    options: (state): CategoryOption[] => mapCategoryTreeToOptions(state.tree),

    /**
     * 分类新增接口当前只接受根分类名称作为 `parentName`，
     * 因此前级分类选择必须收敛到顶级节点，避免前端放出后端不支持的非根父级。
     */
    parentOptions: (state): CategoryOption[] => mapRootCategoryToOptions(state.tree),
  },

  actions: {
    async fetchCategoryTree() {
      this.loading = true

      try {
        const tree = await categoryApi.getCategoryTree()
        this.tree = tree
        return tree
      } finally {
        this.loading = false
      }
    },

    /**
     * 新增分类成功后直接把后端返回节点并入本地树，保证管理弹窗关闭后树形列表即时回显。
     */
    async createCategory(payload: categoryApi.CreateCategoryRequest) {
      this.submitting = true

      try {
        const category = await categoryApi.createCategory(payload)
        this.insertCategoryNode(category, payload.parentName)
        return category
      } finally {
        this.submitting = false
      }
    },

    insertCategoryNode(category: categoryApi.CategoryTreeResponse, parentName: string | null) {
      if (!parentName) {
        this.tree = [...this.tree, category].sort((left, right) => left.sortOrder - right.sortOrder)
        return
      }

      /*
       * 后端当前只接受“根分类名称”作为 `parentName`，
       * 因此前端本地树回显也必须只在顶级节点里匹配，避免把非根分类名误当成受支持契约后出现假成功 UI。
       */
      this.tree = this.tree.map((node) => {
        if (node.name !== parentName) {
          return node
        }

        return {
          ...node,
          children: [...node.children, category].sort(
            (left, right) => left.sortOrder - right.sortOrder,
          ),
        }
      })
    },

    resetState() {
      this.tree = []
      this.loading = false
      this.submitting = false
    },
  },
})
