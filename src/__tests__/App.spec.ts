import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import App from '../App.vue'

describe('App', () => {
  it('mounts renders properly', () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const wrapper = mount(App, {
      global: {
        plugins: [pinia],
        stubs: {
          'router-view': { template: '<div>You did it!</div>' },
          DevTools: { template: '<div />' },
        },
      },
    })

    expect(wrapper.text()).toContain('You did it!')
  })
})
