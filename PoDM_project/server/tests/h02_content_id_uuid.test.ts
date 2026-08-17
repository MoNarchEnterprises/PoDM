// h02_content_id_uuid.test.ts
// Verifies that inserting a content row without specifying an 'id' automatically generates a UUID.

import supabase from '../config/supabaseClient';
import * as ContentModel from '../models/content.model';

describe('Content ID Default UUID', () => {
  let createdContentId: string | null = null;

  afterAll(async () => {
    if (createdContentId) {
      await supabase.from('content').delete().eq('id', createdContentId);
    }
  });

  test('should generate UUID when inserting without id', async () => {
    const { data: creator } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'creator')
      .limit(1)
      .maybeSingle();

    if (creator && creator.id) {
      const { data, error } = await supabase
        .from('content')
        .insert({
          creator_id: creator.id,
          title: 'UUID Default Test Content',
          type: 'photo',
          visibility: 'subscribers_only',
          status: 'published',
          price: 0,
          files: [{ url: 'https://placehold.co/600x400', type: 'image/png' }]
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.id).toMatch(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
      createdContentId = data.id;

      // Verify that findContentById can retrieve content using the string UUID
      const retrieved = await ContentModel.findContentById(data.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(data.id);
    }
  });
});
