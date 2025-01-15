import { Injectable } from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class HelperService {

  public tokenExtractor(req: Request): string {
    return req.headers.authorization.split(' ')[1];
  }
}