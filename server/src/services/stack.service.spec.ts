import { BadRequestException } from '@nestjs/common';
import { AssetVisibility, JobStatus } from 'src/enum';
import { StackService } from 'src/services/stack.service';
import { AssetFactory } from 'test/factories/asset.factory';
import { AuthFactory } from 'test/factories/auth.factory';
import { StackFactory } from 'test/factories/stack.factory';
import { authStub } from 'test/fixtures/auth.stub';
import { getForStack } from 'test/mappers';
import { newUuid } from 'test/small.factory';
import { makeStream, newTestService, ServiceMocks } from 'test/utils';

describe(StackService.name, () => {
  let sut: StackService;
  let mocks: ServiceMocks;

  beforeEach(() => {
    ({ sut, mocks } = newTestService(StackService));
  });

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  describe('handleAutomaticStacking', () => {
    const ownerId = newUuid();
    const localDateTime = new Date('2026-07-13T12:00:00.000Z');

    const asset = (originalFileName: string, overrides: Parameters<typeof AssetFactory.create>[0] = {}) =>
      AssetFactory.create({ ownerId, localDateTime, originalFileName, ...overrides });

    it('should stack RAW, JPEG, and HEIF variants with the lowest numbered JPEG as primary', async () => {
      const raw = asset('_DSF7080.raf');
      const jpeg2 = asset('_DSF7080-2.JPG');
      const jpeg10 = asset('_DSF7080-10.jpeg');
      const heif = asset('_DSF7080.HEIF');

      mocks.stack.streamForAutomaticStacking.mockReturnValue(makeStream([raw, jpeg10, heif, jpeg2]));
      mocks.stack.create.mockResolvedValue({ id: 'stack-id' } as never);

      await expect(sut.handleAutomaticStacking()).resolves.toBe(JobStatus.Success);

      expect(mocks.stack.create).toHaveBeenCalledWith({ ownerId }, [jpeg2.id, jpeg10.id, heif.id, raw.id]);
      expect(mocks.event.emit).toHaveBeenCalledWith('StackCreate', { stackId: 'stack-id', userId: ownerId });
    });

    it('should prefer an unnumbered JPEG, then HEIF and other rendered images over RAW', async () => {
      const raw = asset('photo.RAF');
      const png = asset('PHOTO.png');
      const heif = asset('photo-2.heic');
      const numberedJpeg = asset('photo-1.jpg');
      const jpeg = asset('photo.JPEG');

      mocks.stack.streamForAutomaticStacking.mockReturnValue(makeStream([raw, png, heif, numberedJpeg, jpeg]));
      mocks.stack.create.mockResolvedValue({ id: 'stack-id' } as never);

      await sut.handleAutomaticStacking();

      expect(mocks.stack.create).toHaveBeenCalledWith({ ownerId }, [jpeg.id, numberedJpeg.id, heif.id, png.id, raw.id]);
    });

    it('should keep owners, visibility, and capture dates in separate groups', async () => {
      const assets = [
        asset('photo.raf'),
        asset('photo.jpg', { ownerId: newUuid() }),
        asset('photo.heif', { visibility: AssetVisibility.Archive }),
        asset('photo.png', { localDateTime: new Date('2026-07-14T12:00:00.000Z') }),
      ];

      mocks.stack.streamForAutomaticStacking.mockReturnValue(makeStream(assets));

      await sut.handleAutomaticStacking();

      expect(mocks.stack.create).not.toHaveBeenCalled();
      expect(mocks.event.emit).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should search stacks', async () => {
      const auth = AuthFactory.create();
      const asset = AssetFactory.from().exif().build();
      const stack = StackFactory.from()
        .primaryAsset(asset, (builder) => builder.exif())
        .build();
      mocks.stack.search.mockResolvedValue([getForStack(stack)]);

      await sut.search(auth, { primaryAssetId: asset.id });
      expect(mocks.stack.search).toHaveBeenCalledWith({
        ownerId: auth.user.id,
        primaryAssetId: asset.id,
      });
    });
  });

  describe('create', () => {
    it('should require asset.update permissions', async () => {
      const auth = AuthFactory.create();
      const [primaryAsset, asset] = [AssetFactory.create(), AssetFactory.create()];

      await expect(sut.create(auth, { assetIds: [primaryAsset.id, asset.id] })).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(mocks.access.asset.checkOwnerAccess).toHaveBeenCalled();
      expect(mocks.stack.create).not.toHaveBeenCalled();
    });

    it('should create a stack', async () => {
      const auth = AuthFactory.create();
      const [primaryAsset, asset] = [AssetFactory.from().exif().build(), AssetFactory.from().exif().build()];
      const stack = StackFactory.from()
        .primaryAsset(primaryAsset, (builder) => builder.exif())
        .asset(asset, (builder) => builder.exif())
        .build();

      mocks.access.asset.checkOwnerAccess.mockResolvedValue(new Set([primaryAsset.id, asset.id]));
      mocks.stack.create.mockResolvedValue(getForStack(stack));

      await expect(sut.create(auth, { assetIds: [primaryAsset.id, asset.id] })).resolves.toEqual({
        id: stack.id,
        primaryAssetId: primaryAsset.id,
        assets: [expect.objectContaining({ id: primaryAsset.id }), expect.objectContaining({ id: asset.id })],
      });

      expect(mocks.event.emit).toHaveBeenCalledWith('StackCreate', {
        stackId: stack.id,
        userId: auth.user.id,
      });
      expect(mocks.access.asset.checkOwnerAccess).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should require stack.read permissions', async () => {
      await expect(sut.get(authStub.admin, 'stack-id')).rejects.toBeInstanceOf(BadRequestException);

      expect(mocks.access.stack.checkOwnerAccess).toHaveBeenCalled();
      expect(mocks.stack.getById).not.toHaveBeenCalled();
    });

    it('should fail if stack could not be found', async () => {
      mocks.access.stack.checkOwnerAccess.mockResolvedValue(new Set(['stack-id']));

      await expect(sut.get(authStub.admin, 'stack-id')).rejects.toBeInstanceOf(Error);

      expect(mocks.access.stack.checkOwnerAccess).toHaveBeenCalled();
      expect(mocks.stack.getById).toHaveBeenCalledWith('stack-id');
    });

    it('should get stack', async () => {
      const auth = AuthFactory.create();
      const [primaryAsset, asset] = [AssetFactory.from().exif().build(), AssetFactory.from().exif().build()];
      const stack = StackFactory.from()
        .primaryAsset(primaryAsset, (builder) => builder.exif())
        .asset(asset, (builder) => builder.exif())
        .build();

      mocks.access.stack.checkOwnerAccess.mockResolvedValue(new Set([stack.id]));
      mocks.stack.getById.mockResolvedValue(getForStack(stack));

      await expect(sut.get(auth, stack.id)).resolves.toEqual({
        id: stack.id,
        primaryAssetId: primaryAsset.id,
        assets: [expect.objectContaining({ id: primaryAsset.id }), expect.objectContaining({ id: asset.id })],
      });
      expect(mocks.access.stack.checkOwnerAccess).toHaveBeenCalled();
      expect(mocks.stack.getById).toHaveBeenCalledWith(stack.id);
    });
  });

  describe('update', () => {
    it('should require stack.update permissions', async () => {
      await expect(sut.update(AuthFactory.create(), 'stack-id', {})).rejects.toBeInstanceOf(BadRequestException);

      expect(mocks.stack.getById).not.toHaveBeenCalled();
      expect(mocks.stack.update).not.toHaveBeenCalled();
      expect(mocks.event.emit).not.toHaveBeenCalled();
    });

    it('should fail if stack could not be found', async () => {
      mocks.access.stack.checkOwnerAccess.mockResolvedValue(new Set(['stack-id']));

      await expect(sut.update(AuthFactory.create(), 'stack-id', {})).rejects.toBeInstanceOf(Error);

      expect(mocks.stack.getById).toHaveBeenCalledWith('stack-id');
      expect(mocks.stack.update).not.toHaveBeenCalled();
      expect(mocks.event.emit).not.toHaveBeenCalled();
    });

    it('should fail if the provided primary asset id is not in the stack', async () => {
      const auth = AuthFactory.create();
      const stack = StackFactory.from()
        .primaryAsset({}, (builder) => builder.exif())
        .asset({}, (builder) => builder.exif())
        .build();

      mocks.access.stack.checkOwnerAccess.mockResolvedValue(new Set([stack.id]));
      mocks.stack.getById.mockResolvedValue(getForStack(stack));

      await expect(sut.update(auth, stack.id, { primaryAssetId: 'unknown-asset' })).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(mocks.stack.getById).toHaveBeenCalledWith(stack.id);
      expect(mocks.stack.update).not.toHaveBeenCalled();
      expect(mocks.event.emit).not.toHaveBeenCalled();
    });

    it('should update stack', async () => {
      const auth = AuthFactory.create();
      const [primaryAsset, asset] = [AssetFactory.from().exif().build(), AssetFactory.from().exif().build()];
      const stack = StackFactory.from()
        .primaryAsset(primaryAsset, (builder) => builder.exif())
        .asset(asset, (builder) => builder.exif())
        .build();

      mocks.access.stack.checkOwnerAccess.mockResolvedValue(new Set([stack.id]));
      mocks.stack.getById.mockResolvedValue(getForStack(stack));
      mocks.stack.update.mockResolvedValue(getForStack(stack));

      await sut.update(auth, stack.id, { primaryAssetId: asset.id });

      expect(mocks.stack.getById).toHaveBeenCalledWith(stack.id);
      expect(mocks.stack.update).toHaveBeenCalledWith(stack.id, {
        id: stack.id,
        primaryAssetId: asset.id,
      });
      expect(mocks.event.emit).toHaveBeenCalledWith('StackUpdate', {
        stackId: stack.id,
        userId: auth.user.id,
      });
    });
  });

  describe('delete', () => {
    it('should require stack.delete permissions', async () => {
      await expect(sut.delete(AuthFactory.create(), 'stack-id')).rejects.toBeInstanceOf(BadRequestException);

      expect(mocks.stack.delete).not.toHaveBeenCalled();
      expect(mocks.event.emit).not.toHaveBeenCalled();
    });

    it('should delete stack', async () => {
      const auth = AuthFactory.create();

      mocks.access.stack.checkOwnerAccess.mockResolvedValue(new Set(['stack-id']));
      mocks.stack.delete.mockResolvedValue();

      await sut.delete(auth, 'stack-id');

      expect(mocks.stack.delete).toHaveBeenCalledWith('stack-id');
      expect(mocks.event.emit).toHaveBeenCalledWith('StackDelete', {
        stackId: 'stack-id',
        userId: auth.user.id,
      });
    });
  });

  describe('deleteAll', () => {
    it('should require stack.delete permissions', async () => {
      await expect(sut.deleteAll(authStub.admin, { ids: ['stack-id'] })).rejects.toBeInstanceOf(BadRequestException);

      expect(mocks.stack.deleteAll).not.toHaveBeenCalled();
      expect(mocks.event.emit).not.toHaveBeenCalled();
    });

    it('should delete all stacks', async () => {
      mocks.access.stack.checkOwnerAccess.mockResolvedValue(new Set(['stack-id']));
      mocks.stack.deleteAll.mockResolvedValue();

      await sut.deleteAll(authStub.admin, { ids: ['stack-id'] });

      expect(mocks.stack.deleteAll).toHaveBeenCalledWith(['stack-id']);
      expect(mocks.event.emit).toHaveBeenCalledWith('StackDeleteAll', {
        stackIds: ['stack-id'],
        userId: authStub.admin.user.id,
      });
    });
  });

  describe('removeAsset', () => {
    it('should require stack.update permissions', async () => {
      await expect(sut.removeAsset(authStub.admin, { id: 'stack-id', assetId: 'asset-id' })).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(mocks.stack.getForAssetRemoval).not.toHaveBeenCalled();
      expect(mocks.asset.update).not.toHaveBeenCalled();
      expect(mocks.event.emit).not.toHaveBeenCalled();
    });

    it('should fail if the asset is not in the stack', async () => {
      mocks.access.stack.checkOwnerAccess.mockResolvedValue(new Set(['stack-id']));
      mocks.stack.getForAssetRemoval.mockResolvedValue({ id: null, primaryAssetId: null });

      await expect(sut.removeAsset(authStub.admin, { id: 'stack-id', assetId: newUuid() })).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(mocks.asset.update).not.toHaveBeenCalled();
      expect(mocks.event.emit).not.toHaveBeenCalled();
    });

    it('should fail if the assetId is the primaryAssetId', async () => {
      const asset = AssetFactory.create();
      mocks.access.stack.checkOwnerAccess.mockResolvedValue(new Set(['stack-id']));
      mocks.stack.getForAssetRemoval.mockResolvedValue({ id: 'stack-id', primaryAssetId: asset.id });

      await expect(sut.removeAsset(authStub.admin, { id: 'stack-id', assetId: asset.id })).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(mocks.asset.update).not.toHaveBeenCalled();
      expect(mocks.event.emit).not.toHaveBeenCalled();
    });

    it("should update the asset to nullify it's stack-id", async () => {
      const [primaryAsset, asset] = [AssetFactory.create(), AssetFactory.create()];
      mocks.access.stack.checkOwnerAccess.mockResolvedValue(new Set(['stack-id']));
      mocks.stack.getForAssetRemoval.mockResolvedValue({ id: 'stack-id', primaryAssetId: primaryAsset.id });

      await sut.removeAsset(authStub.admin, { id: 'stack-id', assetId: asset.id });

      expect(mocks.asset.update).toHaveBeenCalledWith({ id: asset.id, stackId: null });
      expect(mocks.event.emit).toHaveBeenCalledWith('StackUpdate', {
        stackId: 'stack-id',
        userId: authStub.admin.user.id,
      });
    });
  });
});
