import { db } from '@/config/database';
import { Timestamp } from 'firebase-admin/firestore';

export interface IUserProfile {
  uid: string;
  email?: string;
  name?: string;
  createdAt: Date;
}

const COLLECTION = 'users';

export const userCollection = () => db().collection(COLLECTION);

export const UserHelper = {
  async findOrCreate(
    uid: string,
    email?: string,
    name?: string
  ): Promise<IUserProfile> {
    const docRef = userCollection().doc(uid);
    const snap = await docRef.get();

    if (snap.exists) {
      const data = snap.data()!;
      return {
        uid: snap.id,
        email: data.email,
        name: data.name,
        createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
      };
    }

    const now = new Date();
    await docRef.set({
      email,
      name,
      createdAt: Timestamp.fromDate(now),
    });
    return { uid, email, name, createdAt: now };
  },
};
