export const BASE_URL = '/v1'
export const TIME_OUT = 50000

export const title = import.meta.env.VITE_APP_TITLE

export function viewList() {
  // import.meta.glob报错的话 在tsconfig.json 下 compilerOptions types 中添加上 `vite/client`
  const files = import.meta.glob('/**/views/**/*.vue', { eager: true })
  const list: any = []

  for (const i in files) {
    if (!i.includes('components')) {
      list.push({
        value: i.substring(5)
      })
    }
  }

  return list
}
