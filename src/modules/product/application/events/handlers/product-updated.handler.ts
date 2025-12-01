import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ProductUpdatedEvent } from '../impl/product-updated.event';

@EventsHandler(ProductUpdatedEvent)
export class ProductUpdatedHandler
  implements IEventHandler<ProductUpdatedEvent>
{
  handle(event: ProductUpdatedEvent) {
    console.log(`Product updated with id: ${event.productId}`);
  }
}
