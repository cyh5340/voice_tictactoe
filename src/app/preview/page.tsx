import { Suspense } from 'react'
import PreviewScreens from './PreviewScreens'

// Screenshot route: renders the Play / Result screens with a fixed fixture,
// no voice backend. ?state=result for the result screen, ?expr=<expression> for a mascot face.
export default function PreviewPage(props: PageProps<'/preview'>) {
  return (
    <Suspense fallback={null}>
      <PreviewScreens searchParams={props.searchParams} />
    </Suspense>
  )
}
