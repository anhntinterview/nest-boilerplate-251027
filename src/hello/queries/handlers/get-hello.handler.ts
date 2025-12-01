import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetHelloQuery } from '../get-hello.query';
import { HelloService } from '../../services/hello.service';

@QueryHandler(GetHelloQuery)
export class GetHelloHandler implements IQueryHandler<GetHelloQuery> {
  constructor(private readonly hellService: HelloService) {}

  /**
   * Handles the GetHelloQuery via the HelloService.
   * In a real-world case, you could fetch data from both Postgres and Mongo here.
   */
  async execute(query: GetHelloQuery): Promise<any> {
    // Example: could call helloService.getGreeting() which interacts with both DBs
    const result = await this.hellService.getGreeting();

    // Optionally, you could extend this logic to aggregate data across both DBs
    // e.g., fetch users from Postgres and logs from Mongo.

    return result;
  }
}
