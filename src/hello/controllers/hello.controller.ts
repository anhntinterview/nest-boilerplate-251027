import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetHelloQuery } from '../queries/get-hello.query';

@Controller('hello')
export class HelloController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getHello() {
    return this.queryBus.execute(new GetHelloQuery());
  }
}
