import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import App from '../App.vue'

describe('App', () => {
  it('渲染基础占位壳层', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: {
            template: '<div><slot :Component="null" /></div>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('智能设备管理系统')
    expect(wrapper.text()).toContain('基础设施搭建')
  })
})
