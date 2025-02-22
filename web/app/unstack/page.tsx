import { Container } from '../components/Container'
import { Unstack } from '../components/Unstack'

export default async function Home() {
  return (
    <>
      <Container as='div' className="mt-12">
        <div className="flex flex-col items-center w-full h-full min-h-full">
          <Unstack />
        </div>
      </Container>
    </>
  )
}
