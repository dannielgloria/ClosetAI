import { Injectable } from "@nestjs/common";
import { Algorithm, hash, verify } from "@node-rs/argon2";
import { PasswordHasherPort } from "@closet-ai/application";

@Injectable()
export class Argon2PasswordHasher implements PasswordHasherPort {
  hashPassword(password: string): Promise<string> {
    return hash(password, { algorithm: Algorithm.Argon2id });
  }

  verifyPassword(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }
}
