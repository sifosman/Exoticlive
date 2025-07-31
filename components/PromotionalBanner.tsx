import { Button } from '@/components/ui/button'

export default function PromotionalBanner() {
  return (
    <section className="bg-primary text-primary-foreground py-16">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">Exclusive Offer</h2>
        <p className="text-xl mb-8">Get 20% off on your first purchase. Use code: PREMIUM20</p>
        <Button size="lg" variant="secondary">
          Shop Now
        </Button>
      </div>
    </section>
  )
}